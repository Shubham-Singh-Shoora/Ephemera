import {
  encryptAES256GCM,
  decryptAES256GCM,
  packEncryptedData,
  unpackEncryptedData,
} from '../src/crypto/aes.js';
import { generateEphemeralKey } from '../src/crypto/keygen.js';

function runTests() {
  console.log('--- Running Cryptography Unit Tests ---\n');

  const key = generateEphemeralKey();
  const sampleSecret = JSON.stringify({
    patientId: 'AIIMS-PATIENT-99824',
    diagnosis: 'Acute Myeloid Leukemia',
    confidentialNotes: 'Proprietary clinical trial drug response sequence',
    dosageHistory: [
      { date: '2026-03-01', compound: 'TX-409', amountMg: 50 },
      { date: '2026-03-08', compound: 'TX-409', amountMg: 75 },
    ],
  });

  // Test 1: Encryption & Decryption Roundtrip
  console.log('Test 1: Roundtrip Encryption and Decryption');
  const payload = encryptAES256GCM(sampleSecret, key);
  console.log(`  Algorithm: ${payload.algorithm}`);
  console.log(`  IV (12 bytes): ${payload.iv}`);
  console.log(`  AuthTag (16 bytes): ${payload.authTag}`);
  console.log(`  Ciphertext length: ${payload.ciphertext.length / 2} bytes`);

  const decryptedBuffer = decryptAES256GCM(payload, key);
  const decryptedText = decryptedBuffer.toString('utf-8');
  if (decryptedText !== sampleSecret) {
    throw new Error('Test 1 Failed: Decrypted text does not match original secret!');
  }
  console.log('  [PASS] Successfully decrypted to original plaintext.\n');

  // Test 2: Serialization (Packing and Unpacking for Swarm)
  console.log('Test 2: Packing for Swarm Upload & Unpacking');
  const packedBuffer = packEncryptedData(payload);
  const unpackedPayload = unpackEncryptedData(packedBuffer);
  const decryptedAfterUnpack = decryptAES256GCM(unpackedPayload, key).toString('utf-8');
  if (decryptedAfterUnpack !== sampleSecret) {
    throw new Error('Test 2 Failed: Unpacked payload does not match!');
  }
  console.log(`  Packed Swarm Payload Size: ${packedBuffer.length} bytes`);
  console.log('  [PASS] Swarm payload packing/unpacking verified.\n');

  // Test 3: Tamper Resistance (Ciphertext Corruption Detection)
  console.log('Test 3: Anti-Tampering (GCM Integrity Verification)');
  const tamperedPayload = { ...payload };
  // Flip the first character of ciphertext
  const firstChar = tamperedPayload.ciphertext[0];
  const alteredChar = firstChar === 'a' ? 'b' : 'a';
  tamperedPayload.ciphertext = alteredChar + tamperedPayload.ciphertext.slice(1);

  let caughtTamper = false;
  try {
    decryptAES256GCM(tamperedPayload, key);
  } catch (err: any) {
    caughtTamper = true;
    console.log(`  Successfully caught tampering attempt: "${err.message}"`);
  }
  if (!caughtTamper) {
    throw new Error('Test 3 Failed: Tampered ciphertext was accepted without error!');
  }
  console.log('  [PASS] AES-256-GCM rejected tampered payload.\n');

  // Test 4: Wrong Key Rejection
  console.log('Test 4: Wrong Key Rejection');
  const wrongKey = generateEphemeralKey();
  let caughtWrongKey = false;
  try {
    decryptAES256GCM(payload, wrongKey);
  } catch (err: any) {
    caughtWrongKey = true;
    console.log(`  Successfully rejected invalid key: "${err.message}"`);
  }
  if (!caughtWrongKey) {
    throw new Error('Test 4 Failed: Wrong key was accepted without error!');
  }
  console.log('  [PASS] Unauthorized decryption prevented.\n');

  console.log('==============================================');
  console.log('ALL CRYPTOGRAPHY TESTS PASSED SUCCESSFULLY! ✅');
  console.log('==============================================');
}

runTests();
