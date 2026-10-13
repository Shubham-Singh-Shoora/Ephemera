// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeadDropCoordinator
 * @notice On-chain coordination referee for Ephemeral Swarm Dead-Drops and Chainlink TEEs.
 * 
 * Flow:
 * 1. Data Provider (Audience 1) uploads encrypted data to Swarm with TTL.
 * 2. Data Provider calls requestComputeJob(), locking escrow reward and providing:
 *    - swarmReference: The 64-char Swarm hash
 *    - taskType: RAG_QUERY (0), EXECUTIVE_AUDIT (1), LORA_FINE_TUNING (2)
 *    - ttlSeconds: Swarm postage expiration window
 *    - encryptedSecretsReference: Chainlink encrypted secrets for the TEE
 * 3. Chainlink TEE / Oracle executes blind computation in RAM and invokes fulfillComputeJob().
 * 4. Contract records immutable attestation hash & non-sensitive summary on-chain,
 *    and releases reward to the oracle / compute provider.
 * 5. If Swarm TTL expires without fulfillment, Data Provider can claim a refund.
 */

interface IFunctionsClient {
    function handleOracleFulfillment(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) external;
}

contract DeadDropCoordinator {
    enum TaskType {
        RAG_QUERY,
        EXECUTIVE_AUDIT,
        LORA_FINE_TUNING
    }

    enum JobStatus {
        PENDING,
        COMPLETED,
        EXPIRED_REFUNDED
    }

    struct ComputeJob {
        bytes32 jobId;
        address requester;
        string swarmReference;
        TaskType taskType;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 rewardAmount;
        JobStatus status;
        bytes32 attestationHash;
        string resultSummary;
    }

    address public owner;
    address public chainlinkRouter;
    uint256 public jobCount;

    // Mapping from jobId to ComputeJob
    mapping(bytes32 => ComputeJob) public jobs;
    // Mapping from Chainlink requestId to jobId
    mapping(bytes32 => bytes32) public requestToJobId;

    event JobRequested(
        bytes32 indexed jobId,
        address indexed requester,
        string swarmReference,
        TaskType taskType,
        uint256 expiresAt,
        uint256 rewardAmount
    );

    event JobFulfilled(
        bytes32 indexed jobId,
        bytes32 indexed requestId,
        bytes32 attestationHash,
        string resultSummary,
        uint256 fulfilledAt
    );

    event JobRefunded(
        bytes32 indexed jobId,
        address indexed requester,
        uint256 refundedAmount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyRouter() {
        require(
            msg.sender == chainlinkRouter || msg.sender == owner,
            "Caller is not authorized Chainlink Router"
        );
        _;
    }

    constructor(address _chainlinkRouter) {
        owner = msg.sender;
        chainlinkRouter = _chainlinkRouter;
    }

    /**
     * @notice Registers a new blind compute request.
     * @param swarmReference Swarm reference hash of encrypted chunks
     * @param taskType Task type (0 = RAG, 1 = Audit, 2 = LoRA)
     * @param ttlSeconds Duration before Swarm batches expire and chunks vanish
     */
    function requestComputeJob(
        string calldata swarmReference,
        TaskType taskType,
        uint256 ttlSeconds
    ) external payable returns (bytes32 jobId) {
        require(bytes(swarmReference).length > 0, "Invalid Swarm reference");
        require(ttlSeconds >= 60, "TTL must be at least 60 seconds");

        jobCount++;
        jobId = keccak256(
            abi.encodePacked(
                msg.sender,
                swarmReference,
                block.timestamp,
                jobCount
            )
        );

        uint256 expiresAt = block.timestamp + ttlSeconds;

        jobs[jobId] = ComputeJob({
            jobId: jobId,
            requester: msg.sender,
            swarmReference: swarmReference,
            taskType: taskType,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            rewardAmount: msg.value,
            status: JobStatus.PENDING,
            attestationHash: bytes32(0),
            resultSummary: ""
        });

        emit JobRequested(
            jobId,
            msg.sender,
            swarmReference,
            taskType,
            expiresAt,
            msg.value
        );

        return jobId;
    }

    /**
     * @notice Links an external Chainlink requestId to an internal jobId.
     */
    function linkChainlinkRequest(bytes32 requestId, bytes32 jobId) external onlyOwner {
        require(jobs[jobId].requester != address(0), "Job does not exist");
        requestToJobId[requestId] = jobId;
    }

    /**
     * @notice Callback invoked by Chainlink Functions / TEE Enclave upon completion.
     * @param requestId Chainlink Functions request ID
     * @param attestationHash Cryptographic proof of computation in RAM
     * @param resultSummary De-identified diagnostic summary or LoRA weight delta hash
     */
    function fulfillComputeJob(
        bytes32 requestId,
        bytes32 attestationHash,
        string calldata resultSummary
    ) external onlyRouter {
        bytes32 jobId = requestToJobId[requestId];
        // If not mapped via requestId, allow direct jobId reference if called with owner/router
        if (jobId == bytes32(0)) {
            jobId = requestId;
        }

        ComputeJob storage job = jobs[jobId];
        require(job.requester != address(0), "Job does not exist");
        require(job.status == JobStatus.PENDING, "Job is not in pending status");
        require(block.timestamp <= job.expiresAt, "Swarm dead-drop has expired!");

        job.status = JobStatus.COMPLETED;
        job.attestationHash = attestationHash;
        job.resultSummary = resultSummary;

        // Payout reward to compute provider/oracle caller
        if (job.rewardAmount > 0) {
            uint256 payout = job.rewardAmount;
            job.rewardAmount = 0;
            (bool success, ) = payable(msg.sender).call{value: payout}("");
            require(success, "Reward transfer failed");
        }

        emit JobFulfilled(
            jobId,
            requestId,
            attestationHash,
            resultSummary,
            block.timestamp
        );
    }

    /**
     * @notice If Swarm TTL expires without TEE fulfillment, requester reclaims escrowed funds.
     * @param jobId Unique identifier of the job
     */
    function refundExpiredJob(bytes32 jobId) external {
        ComputeJob storage job = jobs[jobId];
        require(job.requester != address(0), "Job does not exist");
        require(msg.sender == job.requester || msg.sender == owner, "Unauthorized");
        require(job.status == JobStatus.PENDING, "Job is not pending");
        require(block.timestamp > job.expiresAt, "Job has not expired yet");

        job.status = JobStatus.EXPIRED_REFUNDED;
        uint256 refundAmount = job.rewardAmount;
        job.rewardAmount = 0;

        if (refundAmount > 0) {
            (bool success, ) = payable(job.requester).call{value: refundAmount}("");
            require(success, "Refund transfer failed");
        }

        emit JobRefunded(jobId, job.requester, refundAmount);
    }

    /**
     * @notice Helper to fetch complete job details.
     */
    function getJobDetails(bytes32 jobId) external view returns (ComputeJob memory) {
        require(jobs[jobId].requester != address(0), "Job does not exist");
        return jobs[jobId];
    }

    /**
     * @notice Update authorized Chainlink router address.
     */
    function setChainlinkRouter(address _newRouter) external onlyOwner {
        require(_newRouter != address(0), "Invalid router address");
        chainlinkRouter = _newRouter;
    }
}
