const EMBED_MODEL = "google/gemini-embedding-001";
const EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
export const EMBED_DIMS = 768;

export async function embedText(input: string, apiKey?: string): Promise<number[]> {
  const key = apiKey ?? process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: input.slice(0, 8000), dimensions: EMBED_DIMS }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

export function toPgVectorLiteral(vec: number[]): string {
  return "[" + vec.map((v) => v.toFixed(7)).join(",") + "]";
}
