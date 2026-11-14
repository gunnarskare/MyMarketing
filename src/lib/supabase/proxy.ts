import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions, isSupabaseConfigured, supabaseKey, supabaseUrl } from "./config";

/** Sider som er åpne for alle. Alt annet krever innlogging. */
// Stripe-webhooken må nås uten innlogging. Den sjekker Stripe-signaturen selv.
const PUBLIC_PREFIXES = ["/login", "/auth", "/personvern", "/api/stripe/webhook"];
/** Sider innloggede ikke trenger: de sendes rett til appen. */
const GUEST_ONLY_PATHS = ["/", "/login"];
const APP_HOME = "/dashboard";

function isPublicPath(pathname: string): boolean {
  return pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Videresender, og tar med cookies som ble fornyet i denne forespørselen. */
function redirectTo(request: NextRequest, pathname: string, from: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

/** Fornyer innloggingsøkten og styrer hvem som slipper inn hvor. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Ikke legg kode mellom createServerClient og getClaims: da kan brukere bli logget ut tilfeldig.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!signedIn && !isPublicPath(pathname)) {
    // API-kall får et tydelig svar i stedet for innloggingssiden, så appen kan si fra at økten er utløpt.
    if (pathname.startsWith("/api/")) {
      const denied = NextResponse.json({ error: "Du er logget ut. Last siden på nytt og logg inn igjen." }, { status: 401 });
      response.cookies.getAll().forEach((cookie) => denied.cookies.set(cookie));
      return denied;
    }
    return redirectTo(request, "/login", response);
  }
  if (signedIn && GUEST_ONLY_PATHS.includes(pathname)) {
    return redirectTo(request, APP_HOME, response);
  }

  return response;
}
