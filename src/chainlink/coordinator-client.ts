import { ethers } from 'ethers';

export const DEAD_DROP_COORDINATOR_ABI = [
  "function requestComputeJob(string calldata swarmReference, uint8 taskType, uint256 ttlSeconds) external payable returns (bytes32)",
  "function fulfillComputeJob(bytes32 requestId, bytes32 attestationHash, string calldata resultSummary) external",
  "function refundExpiredJob(bytes32 jobId) external",
  "function linkChainlinkRequest(bytes32 requestId, bytes32 jobId) external",
  "function getJobDetails(bytes32 jobId) external view returns (tuple(bytes32 jobId, address requester, string swarmReference, uint8 taskType, uint256 createdAt, uint256 expiresAt, uint256 rewardAmount, uint8 status, bytes32 attestationHash, string resultSummary))",
  "event JobRequested(bytes32 indexed jobId, address indexed requester, string swarmReference, uint8 taskType, uint256 expiresAt, uint256 rewardAmount)",
  "event JobFulfilled(bytes32 indexed jobId, bytes32 indexed requestId, bytes32 attestationHash, string resultSummary, uint256 fulfilledAt)",
  "event JobRefunded(bytes32 indexed jobId, address indexed requester, uint256 refundedAmount)"
];

export interface OnChainJobDetails {
  jobId: string;
  requester: string;
  swarmReference: string;
  taskType: number;
  createdAt: number;
  expiresAt: number;
  rewardEth: string;
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED_REFUNDED';
  attestationHash: string;
  resultSummary: string;
}

export class DeadDropCoordinatorClient {
  public contract: ethers.Contract;
  public signer: ethers.Signer;

  constructor(contractAddress: string, signer: ethers.Signer) {
    this.signer = signer;
    this.contract = new ethers.Contract(contractAddress, DEAD_DROP_COORDINATOR_ABI, signer);
  }

  /**
   * Data Provider requests a new compute job on-chain
   */
  public async requestJob(
    swarmReference: string,
    taskType: number,
    ttlSeconds: number,
    rewardEth: string = '0.01'
  ): Promise<string> {
    const tx = await this.contract.requestComputeJob(
      swarmReference,
      taskType,
      ttlSeconds,
      { value: ethers.parseEther(rewardEth) }
    );
    const receipt = await tx.wait();

    // Find JobRequested event
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog(log);
        if (parsed && parsed.name === 'JobRequested') {
          return parsed.args.jobId;
        }
      } catch {}
    }

    throw new Error('Failed to find JobRequested event in transaction receipt');
  }

  /**
   * Chainlink TEE Oracle fulfills the compute job with attestation
   */
  public async fulfillJob(
    jobId: string,
    attestationHash: string,
    resultSummary: string
  ): Promise<ethers.TransactionReceipt> {
    const formattedHash = attestationHash.startsWith('0x') 
      ? attestationHash 
      : `0x${attestationHash}`;

    const tx = await this.contract.fulfillComputeJob(
      jobId,
      formattedHash,
      resultSummary
    );
    return await tx.wait();
  }

  /**
   * Fetches job details from the blockchain
   */
  public async getJob(jobId: string): Promise<OnChainJobDetails> {
    const raw = await this.contract.getJobDetails(jobId);
    const statusMap = ['PENDING', 'COMPLETED', 'EXPIRED_REFUNDED'] as const;

    return {
      jobId: raw.jobId,
      requester: raw.requester,
      swarmReference: raw.swarmReference,
      taskType: Number(raw.taskType),
      createdAt: Number(raw.createdAt),
      expiresAt: Number(raw.expiresAt),
      rewardEth: ethers.formatEther(raw.rewardAmount),
      status: statusMap[Number(raw.status)] || 'PENDING',
      attestationHash: raw.attestationHash,
      resultSummary: raw.resultSummary
    };
  }

  /**
   * Claims a refund if the Swarm TTL expired without fulfillment
   */
  public async refundJob(jobId: string): Promise<ethers.TransactionReceipt> {
    const tx = await this.contract.refundExpiredJob(jobId);
    return await tx.wait();
  }
}
