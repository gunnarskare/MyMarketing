// Kall fra nettleseren til våre egne API-er. Gir alltid en melding som kan vises til brukeren,
// også når svaret ikke er JSON (tidsavbrudd, utløpt innlogging, ingen nettforbindelse).

export async function requestJson<T>(url: string, init: RequestInit, fallback: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error("Ingen kontakt med serveren. Sjekk nettforbindelsen og prøv igjen.");
  }
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Ikke JSON. Håndteres under.
  }
  if (response.ok && data !== null && typeof data === "object") return data as T;
  const message = data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string" ? (data as { error: string }).error : "";
  if (message) throw new Error(message);
  if (response.status === 401 || response.redirected) throw new Error("Du er logget ut. Last siden på nytt og logg inn igjen.");
  if (response.status === 504 || response.status === 408) throw new Error("Det tok for lang tid. Prøv igjen om litt.");
  throw new Error(fallback);
}
