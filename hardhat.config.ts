import { defineConfig } from 'hardhat/config';
export default defineConfig({
  networks: { test: { type: 'edr-simulated', chainType: 'l1', hardfork: 'london' } },
});
