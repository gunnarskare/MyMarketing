import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/config";\nimport { buildTypographyDesignInstructions } from "@/lib/typography-prompt";

const PROTOCOL_VERSION = "2025-03-26";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const PROFILE_FIELDS = ["website_url", "tone", "audience", "products", "avoid", "language"] as const;
type ProfileField = (typeof PROFILE_FIELDS)[number];

const tools = [
  {
    name: "get_brand_profile",
    title: "Hent merkevareprofil",
    description: "Henter merkevareprofilen til den tilkoblede Spott-bedriften.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "update_brand_profile",
    title: "Oppdater merkevareprofil",
    description: "Oppdaterer ett eller flere felt i Spott. Bare felter som sendes inn blir endret.",
    inputSchema: {
      type: "object",
      properties: {
        website_url: { type: ["string", "null"], maxLength: 500 },
        tone: { type: ["string", "null"], maxLength: 2000 },
        audience: { type: ["string", "null"], maxLength: 2000 },
        products: { type: ["string", "null"], maxLength: 2000 },
        avoid: { type: ["string", "null"], maxLength: 2000 },
        language: { type: "string", enum: ["nb", "nn", "en"] },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "list_brand_assets",
    title: "List merkevareressurser",
    description: "Lister logoer, bilder og fonter som er lagret i Spott.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "upload_brand_asset",
    title: "Last opp merkevareressurs",
    description: "Laster opp en logo, et bilde eller en font til den tilkoblede Spott-bedriftens private bibliotek. Krever eksplisitt brukerforespørsel.",
    inputSchema: {
      type: "object",
      required: ["file_name", "mime_type", "base64_data", "kind"],
      properties: {
        file_name: { type: "string", minLength: 1, maxLength: 180 },
        mime_type: { type: "string", enum: ["image/jpeg", "image/png", "image/webp", "image/avif", "font/woff2", "font/woff", "font/ttf", "font/otf", "application/font-woff", "application/x-font-ttf", "application/vnd.ms-opentype"] },
        base64_data: { type: "string", description: "Base64-kodet filinnhold. Maks 10 MB dekodet." },
        kind: { type: "string", enum: ["logo", "image", "font"] },
        is_primary: { type: "boolean" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
];

function jsonRpc(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result }, { headers: { "MCP-Protocol-Version": PROTOCOL_VERSION } });
}

function rpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status: 200, headers: { "MCP-Protocol-Version": PROTOCOL_VERSION } });
}

function toolText(text: string, isError = false) {
  return { content: [{ type: "text", text }], isError };
}

async function getContext(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return { error: "Missing bearer access token." } as const;
  if (!supabaseUrl || !supabaseKey) return { error: "Spott is not configured." } as const;

  const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { error: "Invalid or expired Spott access token." } as const;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (orgError || !org) return { error: "No Spott organization is connected to this account." } as const;
  return { supabase, user: userData.user, org } as const;
}

async function runTool(name: string, args: Record<string, unknown>, context: Awaited<ReturnType<typeof getContext>>) {
  if ("error" in context && typeof context.error === "string") return toolText(context.error, true);
  const { supabase, org } = context;

  if (name === "get_brand_profile") {
    const { data, error } = await supabase.from("brand_profiles")
      .select("website_url, tone, audience, products, avoid, language")
      .eq("org_id", org.id).maybeSingle();
    if (error) return toolText(`Kunne ikke hente merkevareprofilen: ${error.message}`, true);
    const { data: typography } = await supabase.from("brand_typography").select("settings").eq("org_id", org.id).maybeSingle();\n    return toolText(JSON.stringify({ organization: org.name, profile: data ?? null, typography: typography?.settings ?? null, design_instructions: buildTypographyDesignInstructions(typography?.settings) }, null, 2));
  }

  if (name === "get_brand_typography") {\n    const { data, error } = await supabase.from("brand_typography").select("settings, updated_at").eq("org_id", org.id).maybeSingle();\n    if (error) return toolText("Kunne ikke hente typografien. Kontroller at typografimigreringen er installert. " + error.message, true);\n    return toolText(JSON.stringify({ organization: org.name, typography: data?.settings ?? null, instruction: "Bruk de definerte fontene for de tilhørende rollene. Ikke erstatt dem med egne fontvalg uten godkjenning.", design_instructions: buildTypographyDesignInstructions(data?.settings), updated_at: data?.updated_at ?? null }, null, 2));\n  }\n\n  if (name === "update_brand_profile") {
    const patch: Record<string, string | null> = {};
    for (const field of PROFILE_FIELDS) {
      if (!(field in args)) continue;
      const value = args[field];
      if (field === "language") {
        if (value !== "nb" && value !== "nn" && value !== "en") return toolText("Språk må være nb, nn eller en.", true);
        patch[field] = value;
      } else if (value === null || typeof value === "string") {
        if (typeof value === "string" && value.length > (field === "website_url" ? 500 : 2000)) {
          return toolText(`Feltet ${field} er for langt.`, true);
        }
        patch[field] = value;
      } else return toolText(`Ugyldig verdi for ${field}.`, true);
    }
    if (Object.keys(patch).length === 0) return toolText("Ingen felter ble sendt inn.", true);
    if (typeof patch.website_url === "string") {
      try {
        const url = new URL(/^https?:\/\//i.test(patch.website_url) ? patch.website_url : `https://${patch.website_url}`);
        if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) throw new Error();
        patch.website_url = url.toString();
      } catch { return toolText("Nettsideadressen er ugyldig.", true); }
    }
    const { error } = await supabase.from("brand_profiles").upsert(
      { org_id: org.id, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "org_id" },
    );
    if (error) return toolText(`Kunne ikke lagre profilen: ${error.message}`, true);
    return toolText(JSON.stringify({ success: true, updated_fields: Object.keys(patch), organization: org.name }));
  }

  if (name === "list_brand_assets") {
    const { data, error } = await supabase.from("brand_assets")
      .select("id, kind, original_name, mime_type, file_size, is_primary, created_at")
      .eq("org_id", org.id).order("created_at", { ascending: false }).limit(100);
    if (error) return toolText(`Kunne ikke hente merkevareressurser. Kontroller at brand library-migreringen er installert. ${error.message}`, true);
    return toolText(JSON.stringify(data ?? [], null, 2));
  }

  if (name === "upload_brand_asset") {
    const fileName = typeof args.file_name === "string" ? args.file_name.trim() : "";
    const mimeType = typeof args.mime_type === "string" ? args.mime_type : "";
    const base64 = typeof args.base64_data === "string" ? args.base64_data : "";
    const kind = args.kind;
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "font/woff2", "font/woff", "font/ttf", "font/otf", "application/font-woff", "application/x-font-ttf", "application/vnd.ms-opentype"]);
    if (!fileName || fileName.length > 180 || !allowed.has(mimeType) || !["logo", "image", "font"].includes(String(kind))) {
      return toolText("Filnavn, filtype eller ressurskategori er ugyldig.", true);
    }
    if (base64.length > Math.ceil(MAX_UPLOAD_BYTES * 4 / 3) + 8 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
      return toolText("Filinnholdet må være gyldig base64 og maksimalt 10 MB.", true);
    }
    const isFont = String(kind) === "font";
    if (isFont !== mimeType.startsWith("font/") && !(isFont && mimeType.startsWith("application/"))) {
      return toolText("Fontfiler må ha font-MIME-type, og logoer/bilder må være bildefiler.", true);
    }
    if (!isFont && !mimeType.startsWith("image/")) return toolText("Logoer og bilder må være bildefiler.", true);
    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) return toolText("Filen må være mellom 1 byte og 10 MB.", true);
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${org.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("brand-assets")
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
    if (uploadError) return toolText(`Opplasting feilet: ${uploadError.message}. Kontroller at brand library-migreringen er installert.`, true);
    const { data, error } = await supabase.from("brand_assets").insert({
      org_id: org.id, kind, original_name: fileName, storage_path: storagePath,
      mime_type: mimeType, file_size: buffer.length, is_primary: args.is_primary === true,
    }).select("id, kind, original_name, mime_type, file_size, is_primary").single();
    if (error) {
      await supabase.storage.from("brand-assets").remove([storagePath]);
      return toolText(`Filen ble lastet opp, men metadata kunne ikke lagres: ${error.message}`, true);
    }
    return toolText(JSON.stringify({ success: true, asset: data }, null, 2));
  }

  return toolText(`Ukjent verktøy: ${name}`, true);
}

export async function GET() {
  return NextResponse.json({
    name: "Spott MCP",
    version: "0.1.0",
    protocol: PROTOCOL_VERSION,
    tools: tools.map(({ name, title, description }) => ({ name, title, description })),
    authentication: "Supabase access token (Bearer); OAuth linking is the next integration milestone.",
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return rpcError(null, -32700, "Parse error"); }

  const id = body.id;
  const method = body.method;
  if (typeof method !== "string") return rpcError(id, -32600, "Invalid request");

  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return new NextResponse(null, { status: 202 });
  }
  if (method === "initialize") {
    return jsonRpc(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "spott", version: "0.1.0" },
      instructions: "Spott lets you read and update a company's brand profile, approved typography system, and private brand assets. When creating marketing materials, call get_brand_typography and follow the assigned font roles exactly. Never silently replace the company's approved fonts. Always confirm with the user before uploading or changing brand data.",
    });
  }
  if (method === "ping") return jsonRpc(id, {});
  if (method === "tools/list") return jsonRpc(id, { tools });
  if (method === "tools/call") {
    const params = (body.params ?? {}) as Record<string, unknown>;
    const name = typeof params.name === "string" ? params.name : "";
    const args = (params.arguments ?? {}) as Record<string, unknown>;
    if (!tools.some((tool) => tool.name === name)) return rpcError(id, -32602, "Unknown tool");
    const context = await getContext(request);
    const result = await runTool(name, args, context);
    return jsonRpc(id, result);
  }
  return rpcError(id, -32601, "Method not found");
}
