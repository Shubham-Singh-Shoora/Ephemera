import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { compileDeadDropCoordinator } from '../src/chainlink/compiler.js';

dotenv.config();

/**
 * Ethereum Sepolia Testnet Deployment Script
 * 
 * Deploys DeadDropCoordinator.sol to Sepolia testnet.
 */
async function main() {
  console.log('======================================================');
  console.log('🚀 DEPLOYING DEADDROPCOORDINATOR TO ETHEREUM SEPOLIA');
  console.log('======================================================');

  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey || privateKey.includes('your_private_key')) {
    console.error('❌ Error: PRIVATE_KEY not found in .env');
    console.error('   Please add your testnet private key to .env to deploy to live Sepolia.');
    process.exit(1);
  }

  // Chainlink Functions Router on Ethereum Sepolia
  // https://docs.chain.link/chainlink-functions/supported-networks
  const CHAINLINK_SEPOLIA_ROUTER = process.env.CHAINLINK_ROUTER_ADDRESS || '0xb83E47D23078804FE775CA7E301104377Ce80d44';

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);

  console.log(`Deployer Address: ${wallet.address}`);
  console.log(`Balance:          ${ethers.formatEther(balance)} Sepolia ETH`);
  console.log(`Chainlink Router: ${CHAINLINK_SEPOLIA_ROUTER}`);

  if (balance === 0n) {
    console.error('\n❌ Insufficient funds: Your wallet has 0 Sepolia ETH.');
    console.error('   Get free testnet ETH from: https://faucets.chain.link or https://sepoliafaucet.com\n');
    process.exit(1);
  }

  console.log('\nCompiling contract artifact...');
  const artifact = compileDeadDropCoordinator();

  console.log('Broadcasting deployment transaction...');
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(CHAINLINK_SEPOLIA_ROUTER);

  console.log(`Transaction Hash: ${contract.deploymentTransaction()?.hash}`);
  console.log('Waiting for block confirmation on Sepolia...');

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log('\n======================================================');
  console.log('✅ DEPLOYMENT SUCCESSFUL ON ETHEREUM SEPOLIA!');
  console.log('======================================================');
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Etherscan Link:   https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
