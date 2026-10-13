import crypto from 'crypto';
import { ethers } from 'ethers';

/**
 * Generates an ephemeral cryptographically secure 256-bit (32-byte) AES key.
 * Used for one-time dead-drops.
 */
export function generateEphemeralKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Derives a 256-bit AES key from a Web3 wallet signature using HKDF (RFC 5869).
 * 
 * How this works in practice:
 * 1. The hospital/user signs a specific message with their EVM private key / MetaMask
 *    e.g., "AIIMS Ephemeral Dead-Drop Authorization | Batch ID: 0x123... | Nonce: 42"
 * 2. The signature (65 bytes hex) serves as high-entropy input keying material (IKM).
 * 3. HKDF extracts and expands this signature into a clean 32-byte AES-256 key.
 * 
 * @param signature Hex signature string (0x...) from eth_sign or signMessage
 * @param salt Optional salt or context string (e.g. batchId, contract address)
 * @returns 64-character hex AES-256 key
 */
export function deriveKeyFromSignature(signature: string, salt: string = 'SWARM_DEAD_DROP_SALT_V1'): string {
  const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
  const sigBuffer = Buffer.from(cleanSig, 'hex');

  // HKDF derivation using SHA-256
  const derivedKey = crypto.hkdfSync(
    'sha256',
    sigBuffer,
    Buffer.from(salt, 'utf-8'),
    Buffer.from('AES-256-GCM-ENCRYPTION-KEY', 'utf-8'),
    32 // 32 bytes = 256 bits
  );

  return Buffer.from(derivedKey).toString('hex');
}

/**
 * Demo CLI helper to generate an ephemeral key or demonstrate wallet derivation
 */
if (process.argv[1] && process.argv[1].endsWith('keygen.ts')) {
  console.log('\n=== Ephemeral Key Generator ===');
  const ephemeralKey = generateEphemeralKey();
  console.log('1. Generated Random Ephemeral AES-256 Key:');
  console.log(`   Key: ${ephemeralKey}`);
  console.log(`   Length: ${ephemeralKey.length / 2} bytes (256 bits)`);

  // Demo wallet derivation
  console.log('\n2. Demonstrating Wallet Signature Derivation:');
  const randomWallet = ethers.Wallet.createRandom();
  console.log(`   Generated Demo Wallet Address: ${randomWallet.address}`);
  
  const message = 'Authorize AIIMS Ephemeral Dead-Drop Session 1001';
  randomWallet.signMessage(message).then(sig => {
    console.log(`   Signature: ${sig.slice(0, 30)}...`);
    const derived = deriveKeyFromSignature(sig, 'session-1001');
    console.log(`   Derived AES-256 Key: ${derived}`);
    console.log('   (Deterministic: the same wallet + message will always derive the exact same key)\n');
  });
}
