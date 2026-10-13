import { spawn } from 'node:child_process';
import process from 'node:process';
const port = 3105;
const base = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    'frontend/node_modules/next/dist/bin/next',
    'start',
    'frontend',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  { cwd: process.cwd(), stdio: 'pipe', windowsHide: true },
);
let serverOutput = '';
server.stdout.on('data', (value) => {
  serverOutput += value.toString();
});
server.stderr.on('data', (value) => {
  serverOutput += value.toString();
});
let ready = false;
try {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error('Production server exited before readiness.');
    try {
      ready = (await fetch(base, { signal: AbortSignal.timeout(1000) })).ok;
    } catch {
      /* starting */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('Production server did not become ready.');
  const check = spawn(process.execPath, ['--test', 'test/security/http.test.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, TEST_BASE_URL: base },
    windowsHide: true,
  });
  const status = await new Promise((resolve, reject) => {
    check.on('error', reject);
    check.on('exit', resolve);
  });
  process.exitCode = typeof status === 'number' ? status : 1;
} catch (error) {
  console.error(error);
  console.error(serverOutput);
  process.exitCode = 1;
} finally {
  server.kill();
}
