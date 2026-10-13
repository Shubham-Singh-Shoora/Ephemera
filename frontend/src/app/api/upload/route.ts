import { NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory active dead-drop sessions registry for the demo frontend
declare global {
  var activeDeadDropSessions: Map<string, {
    swarmReference: string;
    batchId: string;
    ephemeralKey: string;
    fileName: string;
    industry: string;
    rawText: string;
    ciphertext: string;
    authTag: string;
    iv: string;
    byteSize: number;
    chunkCount: number;
    ttlSeconds: number;
    expiresAt: number;
    status: 'ACTIVE' | 'EXPIRED';
  }> | undefined;
}

if (!globalThis.activeDeadDropSessions) {
  globalThis.activeDeadDropSessions = new Map();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, fileName = 'confidential_document.txt', industry = 'general', ttlMinutes = 60 } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Please provide document content to encrypt' }, { status: 400 });
    }

    const ttlSeconds = Math.max(60, Number(ttlMinutes) * 60);

    // Step 1: Generate Ephemeral AES-256 Key
    const ephemeralKey = crypto.randomBytes(32).toString('hex');
    const iv = crypto.randomBytes(12);

    // Step 2: Client-side AES-256-GCM Encryption
    const keyBuffer = Buffer.from(ephemeralKey, 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(content, 'utf-8')),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    // Step 3: Swarm 4KB Chunking simulation
    const SWARM_CHUNK_SIZE = 4096;
    const chunkCount = Math.ceil(encrypted.length / SWARM_CHUNK_SIZE);
    const swarmReference = crypto.createHash('sha256').update(encrypted).digest('hex');
    const batchId = crypto.randomBytes(32).toString('hex');

    const sessionData = {
      swarmReference,
      batchId,
      ephemeralKey,
      fileName,
      industry,
      rawText: content,
      ciphertext: encrypted.toString('hex'),
      authTag: authTag.toString('hex'),
      iv: iv.toString('hex'),
      byteSize: Buffer.byteLength(content, 'utf-8'),
      chunkCount,
      ttlSeconds,
      expiresAt: Date.now() + ttlSeconds * 1000,
      status: 'ACTIVE' as const
    };

    globalThis.activeDeadDropSessions?.set(swarmReference, sessionData);

    return NextResponse.json({
      success: true,
      swarmReference,
      batchId,
      ephemeralKey,
      fileName,
      industry,
      byteSize: sessionData.byteSize,
      chunkCount,
      ttlSeconds,
      expiresAt: sessionData.expiresAt
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
