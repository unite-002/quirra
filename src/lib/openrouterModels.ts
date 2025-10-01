// lib/openrouter.ts
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

export async function fetchAvailableOpenRouterModels() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("❌ Missing OPENROUTER_API_KEY in .env.local");
  }

  const res = await fetch(OPENROUTER_MODELS_URL, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // avoid Next.js caching old responses
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch OpenRouter models: ${res.status}`);
  }

  const data = await res.json();
  const ids = new Set((data?.data || []).map((m: any) => m.id));
  return ids;
}
