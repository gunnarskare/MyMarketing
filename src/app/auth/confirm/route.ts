import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isOtpType(value: string | null): value is EmailOtpType {
  return OTP_TYPES.includes(value as EmailOtpType);
}

/**
 * Lenken i bekreftelses-e-posten og returen fra Google lander her. Støtter variantene Supabase bruker:
 * ?code=... (standardmalen) og ?token_hash=...&type=... (tilpasset mal).
 * Videresender alltid til en fast side i appen, aldri til en adresse fra lenken.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const target = request.nextUrl.clone();
  target.search = "";

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    let confirmed = false;
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      confirmed = !error;
    } else if (tokenHash && isOtpType(type)) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      confirmed = !error;
    }
    if (confirmed) {
      target.pathname = "/dashboard";
      return NextResponse.redirect(target);
    }
  }

  // Supabase legger ved ?error=... når innlogging hos Google ble avbrutt eller feilet.
  target.pathname = "/login";
  target.searchParams.set("melding", searchParams.has("error") ? "google" : "lenke");
  return NextResponse.redirect(target);
}
