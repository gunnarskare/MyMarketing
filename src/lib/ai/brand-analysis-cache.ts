import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { crawlWebsite } from "@/lib/brand-crawler";
import { extractPageText, fetchPublicHtml } from "@/lib/brand-crawler-fetch";
import { ensureOpenAIConfigured } from "@/lib/ai/openai-client";
import { generateBrandAnalysis } from "@/lib/ai/brand-analysis";

type Profile = { website_url:string|null; tone:string|null; audience:string|null; products:string|null; avoid:string|null; language:string|null };

export async function getOrCreateBrandAnalysis(supabase:SupabaseClient, org:{id:string;name:string}, profile:Profile|null, forceRefresh=false) {
  const websiteUrl=profile?.website_url?.trim()||null;
  const profileHash=createHash("sha256").update(JSON.stringify({
    organizationName:org.name,websiteUrl,tone:profile?.tone,audience:profile?.audience,
    products:profile?.products,avoid:profile?.avoid,language:profile?.language
  })).digest("hex");
  const {data:existing,error:readError}=await supabase.from("brand_analyses")
    .select("analysis,website_url,profile_hash,schema_version,analyzed_at,status")
    .eq("org_id",org.id).maybeSingle();
  if(readError) throw new Error("Kunne ikke lese merkevareanalysen fra databasen.");
  if(!forceRefresh&&existing?.schema_version===1&&existing.website_url===websiteUrl&&existing.profile_hash===profileHash)
    return {analysis:existing.analysis,cached:true,analyzedAt:existing.analyzed_at,status:existing.status};
  if(!websiteUrl) return {analysis:existing?.analysis??null,cached:Boolean(existing),analyzedAt:existing?.analyzed_at??null,status:"missing_website"};

  const crawl=await crawlWebsite(websiteUrl,fetchPublicHtml);
  if(!crawl.pages.length) throw new Error(crawl.failures[0]?.error||"Fant ingen tilgjengelige sider på nettsiden.");
  const pages=crawl.pages.map(p=>({url:p.url,text:extractPageText(p.html)}));
  const sourceHash=createHash("sha256").update(pages.map(p=>p.url+"\n"+p.text).join("\n\n")).digest("hex");
  ensureOpenAIConfigured();
  const analysis=await generateBrandAnalysis({
    organizationName:org.name,websiteUrl,
    profile:{tone:profile?.tone,audience:profile?.audience,products:profile?.products,avoid:profile?.avoid,language:profile?.language},
    pages
  });
  const row={
    org_id:org.id,schema_version:1,website_url:websiteUrl,profile_hash:profileHash,
    source_hash:sourceHash,analysis,source_pages:crawl.pages.map(p=>({url:p.url,depth:p.depth})),
    model:process.env.OPENAI_DEFAULT_MODEL||"gpt-5.6-luna",
    status:analysis.quality.requiresHumanReview||analysis.quality.confidence==="low"?"needs_review":"ready",
    approved_at:null,approved_by:null,
    analyzed_at:new Date().toISOString(),updated_at:new Date().toISOString()
  };
  const {error:writeError}=await supabase.from("brand_analyses").upsert(row,{onConflict:"org_id"});
  if(writeError) throw new Error("Kunne ikke lagre merkevareanalysen: "+writeError.message);
  return {analysis,cached:false,analyzedAt:row.analyzed_at,status:row.status};
}
