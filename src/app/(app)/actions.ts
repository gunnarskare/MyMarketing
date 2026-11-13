"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export async function signOut() {
  const auth = await getAuth();
  if (auth) {
    await auth.supabase.auth.signOut();
  }
  redirect("/login");
}
