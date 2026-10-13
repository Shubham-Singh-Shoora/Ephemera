import { MockBeeServer } from '../src/dev-mock/mock-bee.js';
import { ingestDeadDrop } from '../src/ingestion.js';
import { executeConfidentialAISession } from '../src/ai/runner.js';
import { MemoryScrubber } from '../src/ai/memory-scrubber.js';
import assert from 'node:assert/strict';

async function runAIEngineMultiIndustryTests() {
  console.log('===========================================================');
  console.log('🧪 RUNNING LOCAL TEXT RETRIEVAL AND SIMULATION TESTS');
  console.log('===========================================================\n');

  const TEST_PORT = 1636;
  const mockBee = new MockBeeServer(TEST_PORT);
  await mockBee.start();

  try {
    const beeUrl = `http://localhost:${TEST_PORT}`;

    // -------------------------------------------------------------
    // TEST 1: QUANT FINANCE (Algorithmic Trading & Risk Audit)
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: QUANT FINANCE ALPHA & RISK AUDIT ---');
    const financeReceipt = await ingestDeadDrop({
      filePath: './test-data/confidential_finance_trades.json',
      ttlSeconds: 3600,
      batchDepth: 17,
      beeUrl,
    });

    const financeSession = await executeConfidentialAISession({
      swarmReference: financeReceipt.swarmReference,
      ephemeralKey: financeReceipt.ephemeralKey,
      industry: 'finance',
      ragQuery: 'Which trade had anomalous high slippage?',
      runAudit: true,
      beeUrl,
    });

    console.log('Finance RAG Result:');
    console.log(`  Confidence: ${financeSession.ragAnswer?.confidence}`);
    console.log(`  Answer:     ${financeSession.ragAnswer?.answer}`);
    console.log(`  Risk Flags: ${financeSession.auditReport?.riskFlags.join(' | ')}`);

    if (
      !financeSession.ragAnswer?.answer.includes('882195') &&
      !financeSession.ragAnswer?.answer.includes('SLIPPAGE')
    ) {
      throw new Error('TEST 1 FAILED: Finance RAG failed to retrieve anomalous trade!');
    }
    assert.equal(financeSession.auditReport?.mode, 'local-text-inspection');
    assert.equal(financeSession.auditReport?.attestationHash, '');
    assert.deepEqual(financeSession.auditReport?.riskFlags, []);
    console.log(
      '✅ TEST 1 PASSED: Retrieved fictional fixture text without a risk or attestation claim.',
    );

    // -------------------------------------------------------------
    // TEST 2: CORPORATE LEGAL & M&A (Contract Analysis)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: CORPORATE M&A LEGAL CONTRACT ANALYSIS ---');
    const legalReceipt = await ingestDeadDrop({
      filePath: './test-data/confidential_legal_merger.md',
      ttlSeconds: 3600,
      batchDepth: 17,
      beeUrl,
    });

    const legalSession = await executeConfidentialAISession({
      swarmReference: legalReceipt.swarmReference,
      ephemeralKey: legalReceipt.ephemeralKey,
      industry: 'legal',
      ragQuery: 'What is the liability indemnification cap for intellectual property?',
      runAudit: true,
      beeUrl,
    });

    console.log('Legal RAG Result:');
    console.log(`  Confidence: ${legalSession.ragAnswer?.confidence}`);
    console.log(`  Answer:     ${legalSession.ragAnswer?.answer}`);
    console.log(`  Legal Flags: ${legalSession.auditReport?.riskFlags.join(' | ')}`);

    if (
      !legalSession.ragAnswer?.answer.includes('42,000,000') &&
      !legalSession.ragAnswer?.answer.includes('Indemnification')
    ) {
      throw new Error(
        'TEST 2 FAILED: Legal RAG failed to retrieve liability indemnification terms!',
      );
    }
    assert.equal(legalSession.auditReport?.mode, 'local-text-inspection');
    assert.equal(legalSession.auditReport?.attestationHash, '');
    console.log(
      '✅ TEST 2 PASSED: Retrieved fictional contract text. No legal conclusion produced.',
    );

    // -------------------------------------------------------------
    // TEST 3: EPHEMERAL MODEL FINE-TUNING (LoRA Weight Extraction)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: EPHEMERAL MODEL FINE-TUNING SIMULATION ---');
    const healthReceipt = await ingestDeadDrop({
      filePath: './test-data/confidential_patient_record.json',
      ttlSeconds: 3600,
      batchDepth: 17,
      beeUrl,
    });

    const loraSession = await executeConfidentialAISession({
      swarmReference: healthReceipt.swarmReference,
      ephemeralKey: healthReceipt.ephemeralKey,
      industry: 'healthcare',
      runFineTuning: true,
      beeUrl,
    });

    console.log('Simulation-only placeholder receipt:');
    console.log(`  Model Target:     ${loraSession.loraUpdate?.modelArchitecture}`);
    console.log(`  Samples Trained:  ${loraSession.loraUpdate?.trainingSamplesCount}`);
    console.log(`  Loss Delta:       ${loraSession.loraUpdate?.lossDelta}`);
    console.log(`  Weight Delta Hash:${loraSession.loraUpdate?.weightDeltaHash}`);
    console.log(`  Proof Receipt:    ${loraSession.loraUpdate?.trainingReceipt}`);

    assert.equal(loraSession.loraUpdate?.mode, 'simulation');
    assert.equal(loraSession.loraUpdate?.trainingSamplesCount, 0);
    assert.equal(loraSession.loraUpdate?.rank, 0);
    assert.equal(loraSession.loraUpdate?.lossDelta, 0);
    assert.match(loraSession.loraUpdate?.modelArchitecture ?? '', /^simulation:/);
    console.log('✅ TEST 3 PASSED: Simulation is explicit and reports no model training.');

    // -------------------------------------------------------------
    // TEST 4: FORENSIC RAM WIPING VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: OWNED BUFFER ZEROING CHECK ---');
    const testSecretBuffer = Buffer.from('TOP_SECRET_PROPRIETARY_TRADING_ALGORITHM_2026', 'utf-8');
    MemoryScrubber.scrubBuffer(testSecretBuffer);
    const isZeroed = MemoryScrubber.isBufferZeroed(testSecretBuffer);

    if (!isZeroed) {
      throw new Error('TEST 4 FAILED: MemoryScrubber did not zero out memory buffer!');
    }
    console.log('✅ TEST 4 PASSED: Owned buffer is zeroed. This does not prove forensic erasure.');

    console.log('\n===========================================================');
    console.log('🎉 ALL LOCAL TEXT RETRIEVAL AND SIMULATION TESTS PASSED! ✅');
    console.log('===========================================================');
  } finally {
    await mockBee.stop();
  }
}

runAIEngineMultiIndustryTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
