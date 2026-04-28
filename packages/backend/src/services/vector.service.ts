import { QdrantClient } from '@qdrant/js-client-rest';
import { v5 as uuidv5 } from 'uuid';
import { env } from '../config/env';
import { llmEmbed } from '../utils/llm';

const qdrantClient = new QdrantClient({ url: 'http://localhost:6333' });
const COLLECTION_NAME = 'resumes';
const VECTOR_SIZE = 768; // nomic-embed-text generates 768-dimensional vectors

// Fixed namespace for Qdrant IDs
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

export class VectorService {
  /**
   * Ensure the collection exists. If not, create it.
   */
  static async initCollection() {
    try {
      const collections = await qdrantClient.getCollections();
      const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);
      if (!exists) {
        await qdrantClient.createCollection(COLLECTION_NAME, {
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
        console.log(`[Qdrant] Created collection '${COLLECTION_NAME}'`);
      }
    } catch (err) {
      console.error('[Qdrant] Init error:', err);
    }
  }

  /**
   * Embed and upsert a student's resume text.
   */
  static async upsertResume(driveStudentId: string, usn: string, textToEmbed: string) {
    if (!textToEmbed || textToEmbed.trim() === '') return;

    try {
      const embedding = await llmEmbed(textToEmbed);

      // Qdrant requires valid UUIDs. We generate a deterministic UUIDv5 from the driveStudentId
      const id = uuidv5(driveStudentId.toString(), NAMESPACE);

      await qdrantClient.upsert(COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id,
            vector: embedding,
            payload: { driveStudentId, usn },
          },
        ],
      });
    } catch (err) {
      console.error(`[Qdrant] Failed to upsert resume for USN ${usn}:`, err);
    }
  }

  /**
   * Search for top candidates matching a JD.
   */
  static async searchCandidates(jdText: string, limit: number = 50) {
    if (!jdText) return [];

    const embedding = await llmEmbed(jdText);
    const results = await qdrantClient.search(COLLECTION_NAME, {
      vector: embedding,
      limit,
      with_payload: true,
    });

    return results.map((r) => ({
      driveStudentId: r.payload?.driveStudentId as string,
      usn: r.payload?.usn as string,
      score: r.score, // Cosine similarity score
    }));
  }
}
