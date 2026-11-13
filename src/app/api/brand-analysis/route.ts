import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { getOrCreateBrandAnalysis } from "@/lib/ai/brand-analysis-cache";
export const maxDuration=60;
export async function POST() {
  let context:Awaited<ReturnType<typeof requireOrg>>;
  try { context=await requireOrg(); } catch { return NextResponse.json({error:"Du må være logget inn og ha en tilknyttet bedrift."},{status:401}); }
  try {
    const {supabase,org}=context;
    const {data:profile,error}=await supabase.from("brand_profiles").select("website_url,tone,audience,products,avoid,language").eq("org_id",org.id).maybeSingle();
    if(error) throw new Error("Kunne ikke lese merkevareprofilen.");
    const result=await getOrCreateBrandAnalysis(supabase,org,profile,true);
    if(!result.analysis) return NextResponse.json({error:"Legg inn en nettside i merkevareprofilen før analysen kjøres."},{status:400});
    return NextResponse.json({analysis:result.analysis,status:result.status,analyzedAt:result.analyzedAt});
  } catch(error) {
    console.error("Brand analysis refresh failed:",error instanceof Error?error.message:"Unknown error");
    return NextResponse.json({error:error instanceof Error?error.message:"Kunne ikke oppdatere merkevareanalysen."},{status:502});
  }
}
