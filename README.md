# Ephemeral, Dead-Drop AI Knowledge Base (Ethereum Swarm & TEEs)

A high-security, zero-trace Web3 data room designed for confidential AI model fine-tuning and Retrieval-Augmented Generation (RAG).

## Architecture Overview

1. **Storage Layer (Ethereum Swarm)**: Decentralized, metadata-blind, 4KB chunk-shredded storage with Time-To-Live (TTL) postage stamp batches.
2. **Confidentiality Layer (Client-Side AES-256-GCM)**: Authenticated encryption with 12-byte IV and 16-byte GCM integrity tags.
3. **Compute Layer (TEE / Chainlink Functions)**: Blind, in-memory execution environment with zero disk writes.
4. **Pruning Mechanism**: When the postage batch TTL expires, Swarm network nodes automatically discard the underlying chunks, mathematically erasing the data worldwide.

---

## Phase 1 Implementation Summary

- [`src/crypto/aes.ts`](file:///d:/BlockDev/SWARM/src/crypto/aes.ts): High-security authenticated encryption & decryption.
- [`src/crypto/keygen.ts`](file:///d:/BlockDev/SWARM/src/crypto/keygen.ts): Ephemeral 256-bit key generator and Web3 wallet signature derivation (HKDF).
- [`src/swarm/postage.ts`](file:///d:/BlockDev/SWARM/src/swarm/postage.ts): Swarm 4KB chunk math ($2^{depth} \times 4096$) and TTL calculations.
- [`src/swarm/client.ts`](file:///d:/BlockDev/SWARM/src/swarm/client.ts): `@ethersphere/bee-js` client wrapper for health checks, batches, and uploads.
- [`src/dev-mock/mock-bee.ts`](file:///d:/BlockDev/SWARM/src/dev-mock/mock-bee.ts): Built-in local mock Bee node server for instant testing.
- [`src/ingestion.ts`](file:///d:/BlockDev/SWARM/src/ingestion.ts): Dead-Drop ingestion pipeline producing Swarm reference receipts.

---

## Phase 2 Implementation Summary (Universal In-Memory AI Engine)

- [`src/ai/stream-reader.ts`](file:///d:/BlockDev/SWARM/src/ai/stream-reader.ts): Direct-to-RAM streaming from Swarm with zero disk writes.
- [`src/ai/knowledge-base.ts`](file:///d:/BlockDev/SWARM/src/ai/knowledge-base.ts): In-memory semantic vector index with cosine similarity search.
- [`src/ai/inference-engine.ts`](file:///d:/BlockDev/SWARM/src/ai/inference-engine.ts): Multi-industry RAG, executive compliance audits, and ephemeral LoRA fine-tuning parameter updates.
- [`src/ai/memory-scrubber.ts`](file:///d:/BlockDev/SWARM/src/ai/memory-scrubber.ts): Cryptographic RAM wiping (`0x00`) guaranteeing zero forensic residue.
- [`src/ai/runner.ts`](file:///d:/BlockDev/SWARM/src/ai/runner.ts): Orchestrator managing ephemeral sessions from ingestion to RAM purging.

---

## Phase 3 Implementation Summary (Smart Contract & Chainlink TEE Trigger)

- [`contracts/DeadDropCoordinator.sol`](file:///d:/BlockDev/SWARM/contracts/DeadDropCoordinator.sol): Solidity smart contract managing escrow, compute requests, attestation proofs, and refunds.
- [`chainlink/tee-runner.js`](file:///d:/BlockDev/SWARM/chainlink/tee-runner.js): Chainlink Functions JavaScript code executed inside hardware-protected TEE enclaves.
- [`src/chainlink/secrets.ts`](file:///d:/BlockDev/SWARM/src/chainlink/secrets.ts): Threshold encryption manager securing ephemeral keys for the DON TEE.
- [`src/chainlink/compiler.ts`](file:///d:/BlockDev/SWARM/src/chainlink/compiler.ts): Automated Solidity compiler producing ABI & EVM bytecode via `solc`.
- [`src/chainlink/coordinator-client.ts`](file:///d:/BlockDev/SWARM/src/chainlink/coordinator-client.ts): Ethers.js client for Data Providers and Oracles.
- [`src/chainlink/tee-simulator.ts`](file:///d:/BlockDev/SWARM/src/chainlink/tee-simulator.ts): TEE enclave runner simulating blind Swarm retrieval, RAM inference, and on-chain callback.

---

## Phase 4 Implementation Summary (Next.js Dashboard & Testnet Deployment)

- [`frontend/`](file:///d:/BlockDev/SWARM/frontend): Production-grade Next.js 14 App Router testing dashboard.
  - **No-Jargon Enterprise UX**: Clean, authentic interface designed for institutional compliance officers and data scientists.
  - **Self-Destructing Data Room Creator**: Drag-and-drop or select pre-loaded datasets (Finance, Healthcare, Legal M&A) with configurable TTL countdown timers (15m, 2h, 24h).
  - **Live Room Monitor**: Real-time second-by-second countdown with an emergency manual "Trigger Self-Destruct Now" button that instantly wipes storage chunks and produces a global 404.
  - **Confidential Analysis Console**: Run semantic RAG questions, automated executive compliance audits, or LoRA parameter updates with instant RAM scrubbing (`0x00` wipe).
  - **Cryptographic Audit Proof Drawer**: Expandable drawer surfacing Swarm reference hashes, batch IDs, encrypted chunk breakdowns, and cryptographic verification stamps.
- [`scripts/deploy-sepolia.ts`](file:///d:/BlockDev/SWARM/scripts/deploy-sepolia.ts): Automated Ethereum Sepolia testnet deployment script for `DeadDropCoordinator.sol`.

---

## Quickstart & Verification

### 1. Launch the Next.js Testing Dashboard
```bash
# Start the web UI (runs on http://localhost:3000)
npm run ui

# Or build the production frontend
npm run ui:build
```

### 2. Run Backend & Cryptography Unit Tests
```bash
# Cryptography Unit Tests (AES-256-GCM + IV validation)
npm run test:crypto

# Key Generator & Wallet Signature Derivation Demo
npm run keygen

# Full Swarm Dead-Drop Storage Lifecycle (Ingest -> 4KB Chunks -> Download -> Verify)
npm run test:dead-drop

# Phase 2 Multi-Industry AI Inference (RAG, Executive Audit, LoRA, RAM Scrubber)
npm run test:ai

# Compile Solidity Smart Contract
npm run compile

# Phase 3 Smart Contract, Escrow Bounty, & Chainlink TEE Verification
npm run test:contract
```

### 3. Deploy to Ethereum Sepolia Testnet (Optional)
```bash
# Ensure SEPOLIA_RPC_URL and PRIVATE_KEY are configured in .env
npm run deploy:sepolia
```

---

## Deploy to Vercel (1-Click or CLI)

This project is fully Vercel deployment ready.

### Option A: Via Vercel Dashboard (GitHub / GitLab)
1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com/new), select **Import Git Repository**.
3. In **Project Settings**:
   - Set **Root Directory**: `frontend` (or leave as root, as `vercel.json` and `vercel-build` are pre-configured).
   - Framework Preset: **Next.js**.
4. Click **Deploy**.

### Option B: Via Vercel CLI
```bash
# Deploy straight to Vercel preview
npx vercel

# Or deploy straight from frontend directory
cd frontend && npx vercel --prod
```


