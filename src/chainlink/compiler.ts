import fs from 'fs';
import path from 'path';
import solc from 'solc';

export interface CompiledContractArtifact {
  contractName: string;
  abi: any[];
  bytecode: string;
}

/**
 * Compiles DeadDropCoordinator.sol using solc
 */
export function compileDeadDropCoordinator(): CompiledContractArtifact {
  const contractPath = path.resolve('contracts', 'DeadDropCoordinator.sol');
  const sourceCode = fs.readFileSync(contractPath, 'utf-8');

  const input = {
    language: 'Solidity',
    sources: {
      'DeadDropCoordinator.sol': {
        content: sourceCode
      }
    },
    settings: {
      evmVersion: 'london',
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object']
        }
      },
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatalErrors = output.errors.filter((e: any) => e.severity === 'error');
    if (fatalErrors.length > 0) {
      console.error('Solidity Compilation Errors:', fatalErrors);
      throw new Error(`Compilation failed: ${fatalErrors.map((e: any) => e.message).join('\n')}`);
    }
  }

  const contractObj = output.contracts['DeadDropCoordinator.sol']['DeadDropCoordinator'];
  const artifact: CompiledContractArtifact = {
    contractName: 'DeadDropCoordinator',
    abi: contractObj.abi,
    bytecode: `0x${contractObj.evm.bytecode.object}`
  };

  // Ensure output directory exists
  const outDir = path.resolve('dist', 'contracts');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'DeadDropCoordinator.json'),
    JSON.stringify(artifact, null, 2),
    'utf-8'
  );

  return artifact;
}

// Standalone runner
if (process.argv[1] && process.argv[1].endsWith('compiler.ts')) {
  console.log('Compiling DeadDropCoordinator.sol...');
  const res = compileDeadDropCoordinator();
  console.log(`✅ Compilation successful!`);
  console.log(`   Contract: ${res.contractName}`);
  console.log(`   Bytecode size: ${res.bytecode.length / 2} bytes`);
  console.log(`   ABI methods: ${res.abi.filter(a => a.type === 'function').length} functions`);
}
