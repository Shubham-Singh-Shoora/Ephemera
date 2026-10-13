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

  // Explicit trusted simulator; this contract does not implement Chainlink callbacks.
  const simulationOracle = process.env.SIMULATION_ORACLE_ADDRESS;
  if (
    !simulationOracle ||
    !ethers.isAddress(simulationOracle) ||
    simulationOracle === ethers.ZeroAddress
  ) {
    throw new Error(
      'Set SIMULATION_ORACLE_ADDRESS explicitly. This contract is a simulation coordinator, not a Chainlink router client.',
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  if ((await provider.getNetwork()).chainId !== 11155111n)
    throw new Error('Deployment is restricted to Sepolia testnet.');
  const wallet = new ethers.Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);

  console.log(`Deployer Address: ${wallet.address}`);
  console.log(`Balance:          ${ethers.formatEther(balance)} Sepolia ETH`);
  console.log(`Simulation oracle: ${simulationOracle}`);

  if (balance === 0n) {
    console.error('\n❌ Insufficient funds: Your wallet has 0 Sepolia ETH.');
    console.error(
      '   Get free testnet ETH from: https://faucets.chain.link or https://sepoliafaucet.com\n',
    );
    process.exit(1);
  }

  console.log('\nCompiling contract artifact...');
  const artifact = compileDeadDropCoordinator();

  console.log('Broadcasting deployment transaction...');
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(simulationOracle);

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

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
