"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export async function createOrganization(formData: FormData) {
  const { supabase } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 120) {
    redirect("/onboarding?feil=navn");
  }

  // Funksjonen oppretter kunden, eierskapet og en tom merkevareprofil i én transaksjon.
  const { error } = await supabase.rpc("create_organization", { org_name: name });
  if (error) {
    redirect("/onboarding?feil=lagring");
  }
  redirect("/dashboard");
}
