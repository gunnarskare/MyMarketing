"use server";
import { requireOrg } from "@/lib/auth";
import { MAX_TEXT_LENGTH, normalizeWebsiteUrl } from "@/lib/brand-profile";
const fields = ["website_url","tone","audience","products","avoid"] as const;
type Field = typeof fields[number];
export async function saveAssistantAnswer(field: Field, raw: string) {
 if (!fields.includes(field) || typeof raw !== "string") return {ok:false,message:"Ugyldig svar."};
 const value=raw.trim();
 if(value.length>(field==="website_url"?500:MAX_TEXT_LENGTH)) return {ok:false,message:"Svaret er for langt."};
 const {supabase,org}=await requireOrg();
 let normalized:string|null=value||null;
 if(field==="website_url"){normalized=normalizeWebsiteUrl(value)??null;if(value&&!normalized)return {ok:false,message:"Sjekk nettadressen og prøv igjen."};}
 const {data:existing,error:readError}=await supabase.from("brand_profiles").select("website_url,tone,audience,products,avoid,language").eq("org_id",org.id).maybeSingle();
 if(readError)return {ok:false,message:"Kunne ikke hente profilen."};
 const {error}=await supabase.from("brand_profiles").upsert({org_id:org.id,website_url:existing?.website_url??null,tone:existing?.tone??null,audience:existing?.audience??null,products:existing?.products??null,avoid:existing?.avoid??null,language:existing?.language??"nb",[field]:normalized,updated_at:new Date().toISOString()},{onConflict:"org_id"});
 if(error)return {ok:false,message:"Kunne ikke lagre svaret. Prøv igjen."};
 return {ok:true};
}

const SERVICE_OPTIONS = [
 "Lage en logo eller flere logovarianter",
 "Utvikle fargepalett og fargeuttrykk",
 "Finne skrifttyper som passer merkevaren",
 "Lage en bildestil og visuelle eksempler",
 "Lage en komplett merkevareguide",
] as const;

export async function submitBrandRequests(requested: string[]) {
 if (!Array.isArray(requested) || requested.length < 1 || requested.length > SERVICE_OPTIONS.length ||
     requested.some(item => !SERVICE_OPTIONS.includes(item as typeof SERVICE_OPTIONS[number]))) {
   return { ok: false, message: "Velg minst én gyldig oppgave." };
 }
 const { supabase, org } = await requireOrg();
 const { error } = await supabase.from("brand_service_requests").insert({
   org_id: org.id,
   requested_services: requested,
 });
 if (error) return { ok: false, message: "Ønskene kunne ikke sendes inn. Kontroller at siste databaseoppdatering er installert." };
 return { ok: true };
}
