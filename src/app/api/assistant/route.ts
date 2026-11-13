import { NextRequest, NextResponse } from "next/server";
import { run } from "@openai/agents";
import { requireOrg } from "@/lib/auth";
import { ensureOpenAIConfigured } from "@/lib/ai/openai-client";
import { createSpottAssistant } from "@/lib/ai/agents/spott-assistant";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_MESSAGE_LENGTH = 12_000;

export async function POST(request: NextRequest) {
  let context: Awaited<ReturnType<typeof requireOrg>>;
  try {
    context = await requireOrg();
  } catch {
    return NextResponse.json(
      { error: "Du må være logget inn og ha en tilknyttet bedrift." },
      { status: 401 },
    );
  }

  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON-forespørsel." }, { status: 400 });
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "Skriv en melding til Spott." }, { status: 400 });
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Meldingen kan maksimalt være ${MAX_MESSAGE_LENGTH} tegn.` },
      { status: 413 },
    );
  }

  try {
    const { supabase, org } = context;
    const { data: profile, error: profileError } = await supabase
      .from("brand_profiles")
      .select("website_url, tone, audience, products, avoid, language")
      .eq("org_id", org.id)
      .maybeSingle();

    if (profileError) {
      console.error("Spott assistant could not load brand profile:", profileError.message);
    }

    ensureOpenAIConfigured();
    const agent = createSpottAssistant({
      organizationName: org.name,
      websiteUrl: profile?.website_url,
      tone: profile?.tone,
      audience: profile?.audience,
      products: profile?.products,
      avoid: profile?.avoid,
      language: profile?.language,
    });

    const result = await run(agent, body.message.trim());

    if (typeof result.finalOutput !== "string" || !result.finalOutput.trim()) {
      return NextResponse.json(
        { error: "Spott klarte ikke å lage et svar. Prøv igjen." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      answer: result.finalOutput,
      agent: result.lastAgent?.name ?? "Spott Marketing Assistant",
      organization: org.name,
    });
  } catch (error) {
    console.error(
      "Spott assistant request failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    const message = error instanceof Error ? error.message : "";
    if (message.includes("OPENAI_API_KEY is not configured")) {
      return NextResponse.json(
        { error: "OpenAI er ikke konfigurert. Kontroller OPENAI_API_KEY i Vercel." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Spott fikk ikke kontakt med AI-tjenesten. Prøv igjen om litt." },
      { status: 502 },
    );
  }
}
