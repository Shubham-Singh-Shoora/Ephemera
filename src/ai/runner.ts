import { DirectRAMStreamReader } from './stream-reader.js';
import { InMemoryKnowledgeBase } from './knowledge-base.js';
import {
  ConfidentialInferenceEngine,
  type RAGAnswer,
  type ExecutiveAuditReport,
  type EphemeralLoRAUpdate,
} from './inference-engine.js';
export interface AISessionRequest {
  swarmReference: string;
  ephemeralKey: string;
  industry?: 'healthcare' | 'finance' | 'legal' | 'general';
  ragQuery?: string;
  runAudit?: boolean;
  runFineTuning?: boolean;
  beeUrl?: string;
}
export interface AISessionResponse {
  swarmReference: string;
  industry: string;
  byteSize: number;
  ragAnswer?: RAGAnswer;
  auditReport?: ExecutiveAuditReport;
  loraUpdate?: EphemeralLoRAUpdate;
  executionTimeMs: number;
  memoryScrubbed: boolean;
}
/** Local research simulator. Managed-memory cleanup is best effort, not attestation. */
export async function executeConfidentialAISession(
  request: AISessionRequest,
): Promise<AISessionResponse> {
  const start = Date.now();
  const session = await new DirectRAMStreamReader(request.beeUrl).readAndDecrypt(
    request.swarmReference,
    request.ephemeralKey,
  );
  const kb = new InMemoryKnowledgeBase();
  const industry = request.industry || 'general';
  try {
    kb.ingest(session.contentType === 'json' ? session.parsedData : session.rawText, industry);
    const engine = new ConfidentialInferenceEngine(kb);
    return {
      swarmReference: request.swarmReference,
      industry,
      byteSize: session.byteSize,
      ragAnswer: request.ragQuery ? engine.executeRAG(request.ragQuery) : undefined,
      auditReport: request.runAudit
        ? engine.generateExecutiveAudit(session.rawText, industry)
        : undefined,
      loraUpdate: request.runFineTuning ? engine.simulateLoRAFineTuning() : undefined,
      executionTimeMs: Date.now() - start,
      memoryScrubbed: true,
    };
  } finally {
    try {
      session.dispose();
    } finally {
      kb.dispose();
    }
  }
}
