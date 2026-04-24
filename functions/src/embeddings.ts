import { EMBEDDING_DIMENSION, EMBEDDING_MODEL, getGenAi } from "./geminiClient";

const BATCH_SIZE = 8;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const ai = getGenAi();
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (text) => {
        const response = await ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: text,
          config: {
            outputDimensionality: EMBEDDING_DIMENSION,
          },
        });
        const values = response.embeddings?.[0]?.values;
        if (!values) {
          throw new Error("Gemini did not return an embedding for a chunk.");
        }
        return values;
      }),
    );
    out.push(...results);
  }

  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  if (!embedding) {
    throw new Error("Failed to embed query.");
  }
  return embedding;
}
