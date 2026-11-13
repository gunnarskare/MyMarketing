# Spott + ChatGPT (MCP)

This branch adds the first stateless MCP endpoint at `/api/mcp`.

## Tools

- `get_brand_profile`: read the authenticated organization's brand profile.
- `update_brand_profile`: update only the supplied brand-profile fields.
- `list_brand_assets`: list private logos, images and fonts.
- `upload_brand_asset`: upload a base64-encoded image, logo or font to the private brand library.

Every request is scoped to the organization resolved from the authenticated Supabase user. The endpoint never accepts an organization ID from the model. The Supabase access token is validated with `auth.getUser`, and all database/storage access uses that same user's JWT so existing RLS policies remain in force.

## Current authentication status

The first implementation accepts a Supabase access token as a Bearer token. This is useful for protocol and tool-handler development, but is **not yet the end-user ChatGPT connection flow**: Supabase access tokens expire and users should not paste session tokens into third-party clients.

Before public release, implement an OAuth 2.1 authorization-code + PKCE flow with refresh-token rotation and MCP protected-resource metadata. The OAuth authorization server must link a ChatGPT connection to the user's Spott account and issue scoped, revocable access tokens. Do not use a service-role key or a shared global token.

## Deployment

- MCP endpoint: `https://spott.no/api/mcp`
- Health/tool discovery: `GET /api/mcp`
- Protocol: Streamable HTTP, JSON-RPC, stateless POST.
- Required database tables: existing `brand_profiles`, plus `brand_assets` from migration `20261113203600_create_brand_library.sql`.

The brand-library migration has not been applied to the remote Supabase project yet. Asset tools will report a helpful error until it is applied.

## Local protocol smoke test

Initialize:

```bash
curl -i https://spott.no/api/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"mcp-inspector","version":"1.0"}}}'
```

List tools:

```bash
curl -i https://spott.no/api/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

For authenticated tool calls, send a valid Spott Supabase access token as `Authorization: Bearer <token>` during development only.
