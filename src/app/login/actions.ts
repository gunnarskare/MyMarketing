"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

// Feilkoder fra Supabase Auth, oversatt til meldingene på innloggingssiden.
const LOGIN_ERRORS: Record<string, string> = {
  invalid_credentials: "feil",
  email_not_confirmed: "bekreft",
  over_request_rate_limit: "vent",
};
const SIGNUP_ERRORS: Record<string, string> = {
  weak_password: "ugyldig",
  over_email_send_rate_limit: "vent",
  over_request_rate_limit: "vent",
};

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

async function getOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) return origin;
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

export async function login(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/login");
  const { email, password } = readCredentials(formData);
  if (!EMAIL_PATTERN.test(email) || password === "") {
    redirect("/login?melding=feil");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?melding=${LOGIN_ERRORS[error.code ?? ""] ?? "teknisk"}`);
  }
  redirect("/profil");
}

export async function signup(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/login");
  const { email, password } = readCredentials(formData);
  // 72 tegn er grensen Supabase setter for passord.
  if (!EMAIL_PATTERN.test(email) || email.length > 254 || password.length < 8 || password.length > 72) {
    redirect("/login?melding=ugyldig");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await getOrigin()}/auth/confirm` },
  });
  if (error) {
    redirect(`/login?melding=${SIGNUP_ERRORS[error.code ?? ""] ?? "registrering"}`);
  }
  // Økt med en gang betyr at e-postbekreftelse er slått av i Supabase.
  if (data.session) {
    redirect("/profil");
  }
  redirect("/login?melding=sjekk-epost");
}
