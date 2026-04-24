import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebaseAdmin";

export interface RetrievedChunk {
  id: string;
  text: string;
  pageNumber: number | null;
  heading: string | null;
  orderIndex: number;
}

export async function retrieveChunks(
  docId: string,
  queryEmbedding: number[],
  limit = 6,
): Promise<RetrievedChunk[]> {
  const chunksRef = db.collection("documents").doc(docId).collection("chunks");

  try {
    const vectorQuery = chunksRef.findNearest({
      vectorField: "embedding",
      queryVector: FieldValue.vector(queryEmbedding),
      limit,
      distanceMeasure: "COSINE",
    });
    const snap = await vectorQuery.get();
    if (!snap.empty) {
      return snap.docs.map((d) => mapChunk(d.id, d.data()));
    }
  } catch (err) {
    console.warn(
      "Vector search failed, falling back to ordered chunks:",
      err instanceof Error ? err.message : err,
    );
  }

  const fallback = await chunksRef.orderBy("orderIndex").limit(limit).get();
  return fallback.docs.map((d) => mapChunk(d.id, d.data()));
}

function mapChunk(id: string, data: FirebaseFirestore.DocumentData): RetrievedChunk {
  return {
    id,
    text: typeof data.text === "string" ? data.text : "",
    pageNumber:
      typeof data.pageNumber === "number" ? data.pageNumber : null,
    heading: typeof data.heading === "string" ? data.heading : null,
    orderIndex:
      typeof data.orderIndex === "number" ? data.orderIndex : 0,
  };
}
