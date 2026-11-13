import "server-only";

import { setDefaultOpenAIKey } from "@openai/agents";

let configured = false;

/**
 * Configure the Agents SDK once per server process.
 * The key is read only from the server-side OPENAI_API_KEY environment variable.
 */
export function ensureOpenAIConfigured() {
  if (configured) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  setDefaultOpenAIKey(apiKey);
  configured = true;
}
