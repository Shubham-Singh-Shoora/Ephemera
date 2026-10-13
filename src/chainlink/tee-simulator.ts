import { ethers } from 'ethers';
import { ChainlinkSecretsManager, type EncryptedSecretPayload } from './secrets.js';
import { executeConfidentialAISession } from '../ai/runner.js';
import { DeadDropCoordinatorClient } from './coordinator-client.js';
export interface TEEOptions {
  contractAddress: string;
  oracleSigner: ethers.Signer;
  beeUrl?: string;
}
/** Local simulator only. No hardware isolation or attestation is implemented. */
export class ChainlinkTEESimulator {
  private client: DeadDropCoordinatorClient;
  private beeUrl: string;
  constructor(options: TEEOptions) {
    this.client = new DeadDropCoordinatorClient(options.contractAddress, options.oracleSigner);
    this.beeUrl = options.beeUrl || 'http://localhost:1633';
  }
  async executeJobInTEE(
    jobId: string,
    requestId: string,
    secret: EncryptedSecretPayload,
    query = '',
  ) {
    const job = await this.client.getJob(jobId);
    if (job.status !== 'PENDING') throw new Error('Job is not pending.');
    const linkedJob = await this.client.contract.requestToJobId(requestId);
    if (linkedJob.toLowerCase() !== jobId.toLowerCase())
      throw new Error('Request does not match this job.');
    const latest = await this.client.signer.provider?.getBlock('latest');
    if (!latest || latest.timestamp >= job.expiresAt)
      throw new Error('Job has expired or chain time is unavailable.');
    if (typeof query !== 'string' || query.length > 2000)
      throw new Error('Invalid search request.');
    const key = ChainlinkSecretsManager.decryptSecretInsideTEE(secret);
    await executeConfidentialAISession({
      swarmReference: job.swarmReference,
      ephemeralKey: key,
      industry: 'general',
      ragQuery: query,
      runAudit: job.taskType === 1,
      runFineTuning: job.taskType === 2,
      beeUrl: this.beeUrl,
    });
    // Receipt depends only on public job identity, not low-entropy confidential data.
    const attestationHash = ethers.keccak256(ethers.toUtf8Bytes(`LOCAL_SIMULATION:${jobId}`));
    const resultSummary = 'SIMULATION_COMPLETE';
    const receipt = await this.client.fulfillJob(requestId, attestationHash, resultSummary);
    return { attestationHash, resultSummary, txHash: receipt.hash };
  }
}
