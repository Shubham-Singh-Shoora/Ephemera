import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestChain } from '../helpers/local-chain.js';
import { ethers } from 'ethers';
import solc from 'solc';
import { compileDeadDropCoordinator } from '../../src/chainlink/compiler.js';

test('adversarial contract lifecycle on a real local EVM', async (t) => {
  const rpc = await createTestChain();
  const provider = new ethers.BrowserProvider(rpc as never);
  provider.pollingInterval = 10;
  try {
    const owner = await provider.getSigner(0),
      oracle = await provider.getSigner(1),
      stranger = await provider.getSigner(2);
    const artifact = compileDeadDropCoordinator();
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, owner);
    const deployed = await factory.deploy(await oracle.getAddress());
    await deployed.waitForDeployment();
    const contract = new ethers.Contract(await deployed.getAddress(), artifact.abi, owner);
    const oracleContract = contract.connect(oracle) as ethers.Contract;
    const strangerContract = contract.connect(stranger) as ethers.Contract;
    const reference = 'ab'.repeat(32),
      hash = ethers.id('non-sensitive-receipt');
    async function job(ttl = 3600) {
      const receipt = await (
        await contract.requestComputeJob(reference, 0, ttl, { value: 1000n })
      ).wait();
      return contract.interface.parseLog(receipt.logs[0])!.args.jobId as string;
    }
    const id = await job();
    await t.test('zero router deployment is rejected', async () => {
      await assert.rejects(factory.deploy(ethers.ZeroAddress));
    });
    await t.test('malformed reference and unreasonable TTL are rejected', async () => {
      for (const ref of ['', 'z'.repeat(64), 'a'.repeat(65)])
        await assert.rejects(contract.requestComputeJob.staticCall(ref, 0, 60));
      for (const ttl of [0, 59, 86401])
        await assert.rejects(contract.requestComputeJob.staticCall(reference, 0, ttl));
    });
    await t.test('unlinked direct job callback is rejected', async () => {
      await assert.rejects(
        oracleContract.fulfillComputeJob.staticCall(id, hash, 'SIMULATION_COMPLETE'),
      );
    });
    await t.test('stranger cannot link a request', async () => {
      await assert.rejects(strangerContract.linkChainlinkRequest.staticCall(id, id));
    });
    await (await contract.linkChainlinkRequest(id, id)).wait();
    await t.test('request remapping and multiple request links are rejected', async () => {
      await assert.rejects(contract.linkChainlinkRequest.staticCall(id, await job()));
      await assert.rejects(contract.linkChainlinkRequest.staticCall(ethers.id('another'), id));
    });
    await t.test('owner and strangers cannot fulfill or drain the reward', async () => {
      await assert.rejects(contract.fulfillComputeJob.staticCall(id, hash, 'SIMULATION_COMPLETE'));
      await assert.rejects(
        strangerContract.fulfillComputeJob.staticCall(id, hash, 'SIMULATION_COMPLETE'),
      );
    });
    await t.test('confidential text and empty receipts cannot be recorded', async () => {
      await assert.rejects(
        oracleContract.fulfillComputeJob.staticCall(id, hash, 'private paragraph'),
      );
      await assert.rejects(
        oracleContract.fulfillComputeJob.staticCall(id, ethers.ZeroHash, 'SIMULATION_COMPLETE'),
      );
    });
    await (await oracleContract.fulfillComputeJob(id, hash, 'SIMULATION_COMPLETE')).wait();
    await t.test(
      'fulfillment settles once, credits correct oracle, and rejects replay',
      async () => {
        const result = await contract.getJobDetails(id);
        assert.equal(result.status, 1n);
        assert.equal(result.rewardAmount, 0n);
        assert.equal(await contract.pendingWithdrawals(await oracle.getAddress()), 1000n);
        assert.equal(await contract.pendingWithdrawals(await owner.getAddress()), 0n);
        await assert.rejects(
          oracleContract.fulfillComputeJob.staticCall(id, hash, 'SIMULATION_COMPLETE'),
        );
      },
    );
    await t.test('strangers cannot withdraw someone else’s credit', async () => {
      await assert.rejects(strangerContract.withdraw.staticCall(await stranger.getAddress()));
    });
    await (await oracleContract.withdraw(await oracle.getAddress())).wait();
    await t.test('double withdrawal is rejected', async () => {
      assert.equal(await contract.pendingWithdrawals(await oracle.getAddress()), 0n);
      await assert.rejects(oracleContract.withdraw.staticCall(await oracle.getAddress()));
    });
    const expiring = await job(60);
    await (await contract.linkChainlinkRequest(expiring, expiring)).wait();
    await t.test('early refund is rejected', async () => {
      await assert.rejects(contract.refundExpiredJob.staticCall(expiring));
    });
    const deadline = Number((await contract.getJobDetails(expiring)).expiresAt);
    await rpc.request({ method: 'evm_setNextBlockTimestamp', params: [deadline] });
    await rpc.request({ method: 'evm_mine', params: [] });
    await t.test('at exact expiry fulfillment fails and refund succeeds', async () => {
      await assert.rejects(
        oracleContract.fulfillComputeJob.staticCall(expiring, hash, 'SIMULATION_COMPLETE'),
      );
      await assert.rejects(strangerContract.refundExpiredJob.staticCall(expiring));
      await (await contract.refundExpiredJob(expiring)).wait();
      assert.equal((await contract.getJobDetails(expiring)).status, 2n);
      assert.equal(await contract.pendingWithdrawals(await owner.getAddress()), 1000n);
      await assert.rejects(contract.refundExpiredJob.staticCall(expiring));
    });
    await t.test('a reverting recipient cannot destroy withdrawal credit', async () => {
      const output = JSON.parse(
        solc.compile(
          JSON.stringify({
            language: 'Solidity',
            sources: {
              'Reject.sol': {
                content:
                  'pragma solidity ^0.8.20; contract Reject { receive() external payable { revert(); } }',
              },
            },
            settings: {
              evmVersion: 'london',
              outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
            },
          }),
        ),
      );
      const reject = output.contracts['Reject.sol'].Reject;
      const recipient = await new ethers.ContractFactory(
        reject.abi,
        '0x' + reject.evm.bytecode.object,
        owner,
      ).deploy();
      await recipient.waitForDeployment();
      await assert.rejects(async () => {
        await (await contract.withdraw(await recipient.getAddress(), { gasLimit: 100000 })).wait();
      });
      assert.equal(await contract.pendingWithdrawals(await owner.getAddress()), 1000n);
      await (await contract.withdraw(await owner.getAddress())).wait();
      assert.equal(await contract.pendingWithdrawals(await owner.getAddress()), 0n);
    });
  } finally {
    await provider.destroy();
    await rpc.disconnect();
  }
});
