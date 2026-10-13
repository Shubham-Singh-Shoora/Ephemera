// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeadDropCoordinator
 * @notice Research escrow coordinator with an immutable trusted simulator oracle.
 * The owner links request IDs. Only the configured oracle can complete an unexpired
 * job, and settlement creates withdrawal credit. The legacy attestationHash and
 * chainlinkRouter names do not imply hardware verification or Chainlink integration.
 * Deadlines control settlement, not Swarm retention. All calldata is public.
 */

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
    address public immutable chainlinkRouter;
    uint256 public jobCount;

    // Mapping from jobId to ComputeJob
    mapping(bytes32 => ComputeJob) public jobs;
    // Mapping from Chainlink requestId to jobId
    mapping(bytes32 => bytes32) public requestToJobId;
    mapping(bytes32 => bool) public jobLinked;
    mapping(address => uint256) public pendingWithdrawals;

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
            msg.sender == chainlinkRouter,
            "Caller is not authorized Chainlink Router"
        );
        _;
    }

    constructor(address _chainlinkRouter) {
        require(_chainlinkRouter != address(0), "Invalid router address");
        owner = msg.sender;
        chainlinkRouter = _chainlinkRouter;
    }

    /**
     * @notice Registers a simulation request and locks an optional reward.
     * @param swarmReference Swarm reference hash of encrypted chunks
     * @param taskType Task type (0 = RAG, 1 = Audit, 2 = LoRA)
     * @param ttlSeconds Settlement deadline duration, independent of storage retention
     */
    function requestComputeJob(
        string calldata swarmReference,
        TaskType taskType,
        uint256 ttlSeconds
    ) external payable returns (bytes32 jobId) {
        require(bytes(swarmReference).length == 64, "Invalid Swarm reference");
        for (uint256 i = 0; i < 64; i++) {
            bytes1 c = bytes(swarmReference)[i];
            require((c >= 0x30 && c <= 0x39) || (c >= 0x61 && c <= 0x66), "Reference must be lowercase hex");
        }
        require(ttlSeconds >= 60 && ttlSeconds <= 86400, "TTL must be 60 to 86400 seconds");

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
     * @notice Owner links a simulation requestId to one pending internal jobId.
     */
    function linkChainlinkRequest(bytes32 requestId, bytes32 jobId) external onlyOwner {
        require(jobs[jobId].requester != address(0), "Job does not exist");
        require(requestId != bytes32(0) && requestToJobId[requestId] == bytes32(0), "Request already linked or invalid");
        require(!jobLinked[jobId] && jobs[jobId].status == JobStatus.PENDING && block.timestamp < jobs[jobId].expiresAt, "Job not linkable");
        requestToJobId[requestId] = jobId;
        jobLinked[jobId] = true;
    }

    /**
     * @notice Completion recorded by the trusted simulator oracle.
     * @param requestId Previously linked simulation request ID
     * @param attestationHash Nonzero simulation receipt, not verified computation proof
     * @param resultSummary Must be the fixed SIMULATION_COMPLETE status
     */
    function fulfillComputeJob(
        bytes32 requestId,
        bytes32 attestationHash,
        string calldata resultSummary
    ) external onlyRouter {
        bytes32 jobId = requestToJobId[requestId];
        require(jobId != bytes32(0), "Unknown request");
        require(attestationHash != bytes32(0), "Empty receipt");
        // This research coordinator records a fixed status only, never document excerpts.
        require(keccak256(bytes(resultSummary)) == keccak256("SIMULATION_COMPLETE"), "Only simulation status allowed");

        ComputeJob storage job = jobs[jobId];
        require(job.requester != address(0), "Job does not exist");
        require(job.status == JobStatus.PENDING, "Job is not in pending status");
        require(block.timestamp < job.expiresAt, "Job has expired");

        job.status = JobStatus.COMPLETED;
        job.attestationHash = attestationHash;
        job.resultSummary = resultSummary;

        // Payout reward to compute provider/oracle caller
        if (job.rewardAmount > 0) {
            uint256 payout = job.rewardAmount;
            job.rewardAmount = 0;
            pendingWithdrawals[msg.sender] += payout;
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
     * @notice After the job deadline, its requester receives withdrawal credit.
     * @param jobId Unique identifier of the job
     */
    function refundExpiredJob(bytes32 jobId) external {
        ComputeJob storage job = jobs[jobId];
        require(job.requester != address(0), "Job does not exist");
        require(msg.sender == job.requester || msg.sender == owner, "Unauthorized");
        require(job.status == JobStatus.PENDING, "Job is not pending");
        require(block.timestamp >= job.expiresAt, "Job has not expired yet");

        job.status = JobStatus.EXPIRED_REFUNDED;
        uint256 refundAmount = job.rewardAmount;
        job.rewardAmount = 0;

        if (refundAmount > 0) {
            pendingWithdrawals[job.requester] += refundAmount;
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
     * @notice Withdraw the caller's credit to a chosen nonzero recipient.
     */
    function withdraw(address payable recipient) external {
        require(recipient != address(0), "Invalid recipient");
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Withdrawal failed");
    }
}
