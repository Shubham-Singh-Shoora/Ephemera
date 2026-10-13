import { createTestChain } from './helpers/local-chain.js';
import { ethers } from 'ethers';
import { compileDeadDropCoordinator } from '../src/chainlink/compiler.js';
import { MockBeeServer } from '../src/dev-mock/mock-bee.js';
import { ingestDeadDrop } from '../src/ingestion.js';
import { ChainlinkSecretsManager } from '../src/chainlink/secrets.js';
import { DeadDropCoordinatorClient } from '../src/chainlink/coordinator-client.js';
import { ChainlinkTEESimulator } from '../src/chainlink/tee-simulator.js';
import assert from 'node:assert/strict';

async function runSmartContractTEETest() {
  console.log('===========================================================');
  console.log('🧪 RUNNING LOCAL COORDINATOR AND SIMULATOR TEST');
  console.log('===========================================================\n');

  // Step 1: Start local Mock Bee server
  const TEST_BEE_PORT = 1637;
  const mockBee = new MockBeeServer(TEST_BEE_PORT);
  await mockBee.start();

  // Step 2: Start an isolated Hardhat EVM.
  console.log('[Setup] Starting local in-memory Hardhat EVM...');
  const localProvider = await createTestChain();

  const ethersProvider = new ethers.BrowserProvider(localProvider);
  const signer0 = await ethersProvider.getSigner(0); // Data Provider / Deployer
  const signer1 = await ethersProvider.getSigner(1); // Chainlink TEE Oracle Node

  try {
    // Step 3: Compile and deploy DeadDropCoordinator.sol
    console.log('[Setup] Compiling and deploying DeadDropCoordinator.sol...');
    const artifact = compileDeadDropCoordinator();
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer0);

    const contract = await factory.deploy(await signer1.getAddress());
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    console.log(`✅ DeadDropCoordinator deployed at: ${contractAddress}`);

    const clientAudience1 = new DeadDropCoordinatorClient(contractAddress, signer0);
    const beeUrl = `http://localhost:${TEST_BEE_PORT}`;

    // -------------------------------------------------------------
    // SCENARIO 1: AUDIENCE 1 UPLOADS & CREATES ON-CHAIN COMPUTE JOB
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 1: DATA PROVIDER CREATES ON-CHAIN JOB ---');
    // Upload confidential legal M&A dataset to Swarm
    const deadDropReceipt = await ingestDeadDrop({
      filePath: './test-data/confidential_legal_merger.md',
      ttlSeconds: 3600,
      batchDepth: 17,
      beeUrl,
    });

    // Process-local key wrapping only; no DON or enclave is involved.
    console.log('[1.1] Wrapping the synthetic session key for the local simulator...');
    const encryptedSecret = ChainlinkSecretsManager.encryptSecretForDON(
      deadDropReceipt.ephemeralKey,
    );

    // Call requestComputeJob on smart contract with 0.05 ETH escrow
    console.log('[1.2] Registering compute job on-chain with 0.05 ETH escrow reward...');
    const jobId = await clientAudience1.requestJob(
      deadDropReceipt.swarmReference,
      0, // TaskType.RAG_QUERY
      3600,
      '0.05',
    );
    console.log(`      ✅ Job Created On-Chain! Job ID: ${jobId}`);

    // Verify on-chain state
    let jobState = await clientAudience1.getJob(jobId);
    console.log(`      Status: ${jobState.status} | Escrow: ${jobState.rewardEth} ETH`);
    if (jobState.status !== 'PENDING') {
      throw new Error('Test Failure: Job status is not PENDING');
    }

    // -------------------------------------------------------------
    // SCENARIO 2: CHAINLINK TEE ENCLAVE FULFILLS JOB & CLAIMS BOUNTY
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 2: TRUSTED LOCAL ORACLE FULFILLMENT ---');
    const teeSimulator = new ChainlinkTEESimulator({
      contractAddress,
      oracleSigner: signer1,
      beeUrl,
    });

    const initialOracleBalance = await ethersProvider.getBalance(await signer1.getAddress());
    const requestId = ethers.id(`local-request:${jobId}`);
    await (await clientAudience1.contract.linkChainlinkRequest(requestId, jobId)).wait();
    await assert.rejects(
      teeSimulator.executeJobInTEE(jobId, ethers.id('unlinked'), encryptedSecret),
      /does not match/,
    );

    // Execute TEE job
    await teeSimulator.executeJobInTEE(
      jobId,
      requestId,
      encryptedSecret,
      'What is the indemnification liability cap?',
    );

    // Verify on-chain state post-fulfillment
    jobState = await clientAudience1.getJob(jobId);
    console.log(`[2.1] Verifying on-chain state post-fulfillment:`);
    console.log(`      Status:           ${jobState.status}`);
    console.log(`      Simulation Receipt: ${jobState.attestationHash}`);
    console.log(`      Result Summary:   ${jobState.resultSummary}`);

    if (jobState.status !== 'COMPLETED') {
      throw new Error('Test Failure: Job status is not COMPLETED');
    }

    const finalOracleBalance = await ethersProvider.getBalance(await signer1.getAddress());
    console.log(`[2.2] Initial Oracle Balance: ${ethers.formatEther(initialOracleBalance)} ETH`);
    console.log(`      Final Oracle Balance:   ${ethers.formatEther(finalOracleBalance)} ETH`);
    console.log(`      Remaining Job Escrow:   ${jobState.rewardEth} ETH (0 expected)`);
    if (jobState.rewardEth !== '0.0') {
      throw new Error('Test Failure: Escrow was not emptied after fulfillment');
    }
    assert.equal(jobState.resultSummary, 'SIMULATION_COMPLETE');
    assert.equal(
      await contract.getFunction('pendingWithdrawals')(await signer1.getAddress()),
      ethers.parseEther('0.05'),
    );
    console.log('✅ SCENARIO 2 PASSED: Simulator completion and withdrawal credit verified.');

    // -------------------------------------------------------------
    // SCENARIO 3: REFUND TIMELOCK IF SWARM TTL EXPIRES
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 3: REFUND TIMELOCK MECHANISM ---');
    console.log('[3.1] Creating a job with short TTL (60 seconds)...');
    const shortJobId = await clientAudience1.requestJob(
      '000000000000000000000000000000000000000000000000000000000000dead',
      1, // TaskType.EXECUTIVE_AUDIT
      60,
      '0.02',
    );

    // Fast-forward EVM blockchain time by 100 seconds
    console.log('[3.2] Fast-forwarding EVM block timestamp by 100 seconds...');
    await localProvider.request({
      method: 'evm_increaseTime',
      params: [100],
    });
    await localProvider.request({
      method: 'evm_mine',
      params: [],
    });

    console.log('[3.3] Claiming refund on expired job...');
    await clientAudience1.refundJob(shortJobId);

    const refundedJob = await clientAudience1.getJob(shortJobId);
    console.log(`      Job Status: ${refundedJob.status}`);
    if (refundedJob.status !== 'EXPIRED_REFUNDED') {
      throw new Error('Test Failure: Job status is not EXPIRED_REFUNDED');
    }
    console.log('✅ SCENARIO 3 PASSED: Refund timelock protected user funds!');

    console.log('\n===========================================================');
    console.log('🎉 ALL LOCAL COORDINATOR AND SIMULATOR TESTS PASSED! ✅');
    console.log('===========================================================');
  } finally {
    await mockBee.stop();
    await localProvider.disconnect();
  }
}

runSmartContractTEETest().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
