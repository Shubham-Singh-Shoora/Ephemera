import express, { type ErrorRequestHandler } from 'express';
import crypto from 'crypto';
import type { Server } from 'node:http';
import { SWARM_CHUNK_SIZE_BYTES } from '../swarm/postage.js';

/**
 * Educational Mock Bee Node Server
 *
 * Implements the core Swarm REST API specifications:
 * - 4KB BMT chunking simulation
 * - Postage Stamp Batches with TTL (Time-To-Live)
 * - Automatic chunk garbage collection / pruning upon batch expiration
 * - Compatible with @ethersphere/bee-js SDK
 */

interface MockBatch {
  batchId: string;
  depth: number;
  amount: string;
  bucketDepth: number;
  utilization: number;
  ttlSeconds: number;
  expiresAt: number;
  label: string;
}

interface StoredDeadDrop {
  reference: string;
  batchId: string;
  data: Buffer;
  chunkCount: number;
  size: number;
  uploadedAt: number;
}

export class MockBeeServer {
  private app = express();
  private batches = new Map<string, MockBatch>();
  private chunks = new Map<string, StoredDeadDrop>();
  private port: number;
  private server: Server | null = null;
  private prunerInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 1633) {
    this.port = port;
    this.setupRoutes();
    this.createDefaultEphemeralBatch();
  }

  private createDefaultEphemeralBatch() {
    const defaultBatchId = '000000000000000000000000000000000000000000000000000000000000dead';
    this.batches.set(defaultBatchId, {
      batchId: defaultBatchId,
      depth: 17,
      amount: '1000000',
      bucketDepth: 16,
      utilization: 1,
      ttlSeconds: 3600, // 1 hour default
      expiresAt: Date.now() + 3600 * 1000,
      label: 'Default Ephemeral Batch',
    });
  }

  private setupRoutes() {
    this.app.disable('x-powered-by');
    this.app.use((req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      // Loopback binding alone does not stop a browser using DNS rebinding.
      try {
        const host = new URL(`http://${req.headers.host ?? ''}`).hostname;
        if (!['localhost', '127.0.0.1', '[::1]'].includes(host))
          return res.status(403).json({ message: 'Loopback host required' });
      } catch {
        return res.status(403).json({ message: 'Loopback host required' });
      }
      // Local test fixture only; reject browser-origin writes.
      if (req.headers.origin && req.method !== 'GET')
        return res.status(403).json({ message: 'Browser writes disabled' });
      next();
    });
    // Root endpoint (checked by bee.checkConnection() and isConnected())
    this.app.get('/', (req, res) => {
      res.json({
        status: 'ok',
        version: '2.4.0-mock',
        apiVersion: '6.0.0',
      });
    });

    // Health endpoint (checked by bee.getHealth())
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        version: '2.4.0-mock',
        apiVersion: '6.0.0',
        debugApiVersion: '6.0.0',
      });
    });

    // Node readiness
    this.app.get('/readiness', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Chainstate (queried by bee.createPostageBatch)
    this.app.get('/chainstate', (req, res) => {
      res.json({
        block: 1234567,
        chainTip: 1234567,
        totalAmount: '1000000000',
        currentPrice: '1',
      });
    });

    // List postage stamp batches
    this.app.get('/stamps', (req, res) => {
      const now = Date.now();
      const list = Array.from(this.batches.values()).map((b) => {
        const remainingTtl = Math.max(0, Math.floor((b.expiresAt - now) / 1000));
        return {
          batchID: b.batchId,
          utilization: b.utilization,
          usable: remainingTtl > 0,
          label: b.label,
          depth: b.depth,
          amount: b.amount,
          bucketDepth: b.bucketDepth,
          blockNumber: 1234567,
          immutableFlag: false,
          batchTTL: remainingTtl,
        };
      });
      res.json({ stamps: list });
    });

    // Create a new postage stamp batch (simulating blockchain purchase)
    this.app.post('/stamps/:amount/:depth', (req, res) => {
      const amount = req.params.amount;
      const depth = parseInt(req.params.depth, 10);
      if (
        !/^\d+$/.test(req.params.depth) ||
        depth < 17 ||
        depth > 32 ||
        !/^[1-9]\d{0,4}$/.test(amount) ||
        Number(amount) > 86400
      )
        return res.status(400).json({ message: 'Invalid mock batch parameters' });
      if (this.batches.size >= 64)
        return res.status(503).json({ message: 'Mock batch capacity reached' });
      const label = req.query.label ?? 'Ephemeral Dead-Drop Batch';
      if (typeof label !== 'string' || label.length > 80)
        return res.status(400).json({ message: 'Invalid batch label' });

      // Duration: if user passes custom ttl header or query, use it, else calculate from amount
      // For demo / simulation purposes, amount = duration in seconds if <= 86400, or standard calculation
      const ttlSeconds =
        parseInt(amount, 10) > 0 && parseInt(amount, 10) <= 86400 ? parseInt(amount, 10) : 7200; // default 2 hours

      const batchId = crypto.randomBytes(32).toString('hex');
      const batch: MockBatch = {
        batchId,
        depth,
        amount,
        bucketDepth: 16,
        utilization: 0,
        ttlSeconds,
        expiresAt: Date.now() + ttlSeconds * 1000,
        label,
      };

      this.batches.set(batchId, batch);
      console.log(
        `[MockBee] Created new postage batch ${batchId.slice(0, 16)}... (TTL: ${ttlSeconds}s)`,
      );
      res.status(201).json({ batchID: batchId });
    });

    // Upload raw bytes to Swarm (POST /bytes)
    this.app.post(
      '/bytes',
      express.raw({ type: 'application/octet-stream', limit: '5mb', inflate: false }),
      (req, res) => {
        const batchId = req.headers['swarm-postage-batch-id'] as string;
        if (!batchId) {
          return res.status(400).json({ message: 'Missing swarm-postage-batch-id header' });
        }

        const batch = this.batches.get(batchId);
        if (!batch || Date.now() >= batch.expiresAt) {
          return res.status(400).json({ message: 'Invalid or expired postage stamp batch' });
        }

        const data = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
        if (!data || data.length === 0) {
          return res.status(400).json({ message: 'Empty body payload' });
        }

        // Swarm chunking simulation:
        // In real Swarm, payload is sliced into 4096-byte BMT chunks.
        // Reference hash is the Merkle root of the chunk tree.
        const chunkCount = Math.ceil(data.length / SWARM_CHUNK_SIZE_BYTES);
        const reference = crypto.createHash('sha256').update(data).digest('hex');
        const existing = this.chunks.get(reference);
        if (existing) {
          data.fill(0);
          if (existing.batchId !== batchId)
            return res.status(409).json({ message: 'Reference already belongs to another batch' });
          return res.status(201).json({ reference });
        }
        const storedBytes = [...this.chunks.values()].reduce((sum, chunk) => sum + chunk.size, 0);
        if (this.chunks.size >= 64 || storedBytes + data.length > 16 * 1024 * 1024) {
          data.fill(0);
          return res.status(503).json({ message: 'Mock storage capacity reached' });
        }

        this.chunks.set(reference, {
          reference,
          batchId,
          data,
          chunkCount,
          size: data.length,
          uploadedAt: Date.now(),
        });

        console.log(
          `[MockBee] Uploaded ${data.length} bytes -> Sliced into ${chunkCount} chunk(s) (4KB each)`,
        );
        console.log(`[MockBee] Generated Swarm Reference: ${reference}`);

        res.status(201).json({ reference });
      },
    );

    // Download raw bytes from Swarm (GET /bytes/:reference)
    this.app.get('/bytes/:reference', (req, res) => {
      const reference = req.params.reference;
      const stored = this.chunks.get(reference);

      if (!stored) {
        return res.status(404).json({ message: 'Not found or pruned from Swarm network' });
      }

      // Check if associated batch has expired
      const batch = this.batches.get(stored.batchId);
      if (!batch || Date.now() >= batch.expiresAt) {
        // Drop data chunks permanently!
        stored.data.fill(0);
        this.chunks.delete(reference);
        console.log(
          `[MockBee] Access denied: Batch ${stored.batchId.slice(0, 16)}... has expired! Chunks dropped.`,
        );
        return res.status(404).json({
          message: 'Swarm postage batch expired: Chunks purged by garbage collector (404)',
        });
      }

      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(stored.data);
    });
    const bodyError: ErrorRequestHandler = (error, _req, res, _next) => {
      const status = error?.status === 413 ? 413 : error?.status === 415 ? 415 : 400;
      res.status(status).json({ message: 'Unsupported or oversized request body' });
    };
    this.app.use(bodyError);
  }

  /**
   * Background pruner simulating Swarm node garbage collection
   */
  private startPruner() {
    this.prunerInterval = setInterval(() => {
      const now = Date.now();
      for (const [ref, stored] of this.chunks.entries()) {
        const batch = this.batches.get(stored.batchId);
        if (!batch || now >= batch.expiresAt) {
          stored.data.fill(0);
          this.chunks.delete(ref);
        }
      }
      for (const [id, batch] of this.batches) if (now >= batch.expiresAt) this.batches.delete(id);
    }, 1000);
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, '127.0.0.1', () => {
        console.log(`🐝 Mock Bee Node running on http://localhost:${this.port}`);
        console.log(`   Simulating 4KB Merkle chunking & Swarm postage pruning`);
        this.startPruner();
        resolve();
      });
      this.server.on('error', reject);
      this.server.requestTimeout = 10_000;
      this.server.headersTimeout = 5_000;
      this.server.maxConnections = 32;
    });
  }

  public async stop(): Promise<void> {
    for (const stored of this.chunks.values()) stored.data.fill(0);
    this.chunks.clear();
    this.batches.clear();
    if (this.prunerInterval) clearInterval(this.prunerInterval);
    const server = this.server;
    if (server) {
      return new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
        this.server = null;
      });
    }
  }

  /**
   * Helper to set custom expiration on a batch (for instant testing of self-destruction)
   */
  public expireBatchImmediately(batchId: string) {
    const batch = this.batches.get(batchId);
    if (batch) {
      batch.expiresAt = Date.now() - 1000;
      batch.ttlSeconds = 0;
    }
  }
}

// Standalone runner
if (process.argv[1] && process.argv[1].endsWith('mock-bee.ts')) {
  const port = parseInt(process.env.PORT || '1633', 10);
  const server = new MockBeeServer(port);
  server.start();
}
