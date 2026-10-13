import { ethers } from 'ethers';
import { ChainlinkSecretsManager, EncryptedSecretPayload } from './secrets.js';
import { executeConfidentialAISession } from '../ai/runner.js';
import { DeadDropCoordinatorClient } from './coordinator-client.js';

export interface TEEOptions {
  contractAddress: string;
  oracleSigner: ethers.Signer;
  beeUrl?: string;
}

/**
 * Simulates a Chainlink Functions Decentralized Oracle Network (DON) node
 * running in a hardware-protected TEE enclave (Intel SGX / Nitro).
 */
export class ChainlinkTEESimulator {
  private coordinatorClient: DeadDropCoordinatorClient;
  private beeUrl: string;

  constructor(options: TEEOptions) {
    this.coordinatorClient = new DeadDropCoordinatorClient(
      options.contractAddress,
      options.oracleSigner
    );
    this.beeUrl = options.beeUrl || 'http://localhost:1633';
  }

  /**
   * Executes a blind compute request in TEE memory and submits fulfillment on-chain.
   * 
   * @param jobId The on-chain job identifier
   * @param encryptedSecret The secret encrypted for the DON
   * @param query Optional RAG query or user prompt
   */
  public async executeJobInTEE(
    jobId: string,
    encryptedSecret: EncryptedSecretPayload,
    query: string = ''
  ): Promise<{
    attestationHash: string;
    resultSummary: string;
    txHash: string;
  }> {
    console.log('\n======================================================');
    console.log('🛡️  CHAINLINK DON TEE ENCLAVE: ISOLATED HARDWARE RUNNER');
    console.log('======================================================');
    console.log(`[1] Received Job ID: ${jobId}`);

    // Query on-chain job status
    const job = await this.coordinatorClient.getJob(jobId);
    console.log(`    Requester:       ${job.requester}`);
    console.log(`    Swarm Reference: ${job.swarmReference}`);
    console.log(`    Task Type:       ${job.taskType} (0=RAG, 1=Audit, 2=LoRA)`);
    console.log(`    Escrow Bounty:   ${job.rewardEth} ETH`);

    // Step 1: Decrypt ephemeral key strictly inside CPU cache
    console.log('[2] Decrypting ephemeral AES key using DON threshold private key...');
    const ephemeralKey = ChainlinkSecretsManager.decryptSecretInsideTEE(encryptedSecret);
    console.log('    ✅ Decryption key unlocked inside TEE memory.');

    // Step 2: Execute blind in-memory AI session (RAM only)
    console.log('[3] Pulling encrypted chunks from Swarm & executing AI in RAM...');
    const taskTypeMap = ['general', 'finance', 'healthcare'] as const;
    const aiSession = await executeConfidentialAISession({
      swarmReference: job.swarmReference,
      ephemeralKey,
      industry: 'general',
      ragQuery: query || (job.taskType === 0 ? 'Summarize critical elements' : undefined),
      runAudit: job.taskType === 1,
      runFineTuning: job.taskType === 2,
      beeUrl: this.beeUrl
    });

    // Step 3: Format attestation and non-sensitive summary
    let resultSummary = '';
    let attestationHash = '';

    if (job.taskType === 0 && aiSession.ragAnswer) {
      resultSummary = `[RAG Evidence]: ${aiSession.ragAnswer.answer.slice(0, 180)}...`;
      attestationHash = ethers.keccak256(ethers.toUtf8Bytes(aiSession.ragAnswer.answer));
    } else if (job.taskType === 1 && aiSession.auditReport) {
      resultSummary = `[Audit Certified]: ${aiSession.auditReport.summary}`;
      attestationHash = `0x${aiSession.auditReport.attestationHash}`;
    } else if (job.taskType === 2 && aiSession.loraUpdate) {
      resultSummary = `[LoRA Weights Delta]: ${aiSession.loraUpdate.weightDeltaHash}`;
      attestationHash = aiSession.loraUpdate.trainingReceipt as string;
    } else {
      resultSummary = '[TEE Executed]: Blind session completed with zero disk writes.';
      attestationHash = ethers.keccak256(ethers.toUtf8Bytes(jobId));
    }

    // Step 4: Submit on-chain fulfillment
    console.log('[4] Submitting cryptographic attestation to DeadDropCoordinator...');
    console.log(`    Attestation Hash: ${attestationHash}`);
    console.log(`    Summary:          ${resultSummary}`);

    const txReceipt = await this.coordinatorClient.fulfillJob(
      jobId,
      attestationHash,
      resultSummary
    );

    console.log(`    ✅ On-chain fulfillment confirmed! Tx: ${txReceipt.hash}`);
    console.log('======================================================\n');

    return {
      attestationHash,
      resultSummary,
      txHash: txReceipt.hash
    };
  }
}
