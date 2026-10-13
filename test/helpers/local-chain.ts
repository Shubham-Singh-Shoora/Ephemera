import { network } from 'hardhat';
/** Isolated in-process chain; no listener, no external RPC, no real funds. */
export async function createTestChain() {
  const connection = await network.create('test');
  return {
    request: connection.provider.request.bind(connection.provider),
    disconnect: () => connection.close(),
  };
}
