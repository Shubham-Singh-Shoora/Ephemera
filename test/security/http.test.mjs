import { test } from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname))
  throw new Error('HTTP checks are restricted to loopback.');

test('production response has fresh CSP nonces and restrictive privacy headers', async () => {
  const a = await fetch(base),
    b = await fetch(base);
  assert.equal(a.status, 200);
  const csp = a.headers.get('content-security-policy');
  assert.ok(csp);
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.notEqual(csp, b.headers.get('content-security-policy'));
  assert.equal(a.headers.get('x-frame-options'), 'DENY');
  assert.equal(a.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(a.headers.get('x-content-type-options'), 'nosniff');
  assert.match(a.headers.get('cache-control'), /no-store/);
  const nonce = csp.match(/'nonce-([^']+)'/)[1];
  const html = await a.text();
  assert.ok(html.includes(`nonce="${nonce}"`));
  assert.doesNotMatch(html, /https:\/\/[^" ]+\.js/);
});
for (const route of ['upload', 'analyze', 'expire'])
  test(`${route} rejects malformed and cross-origin legacy requests`, async () => {
    const response = await fetch(`${base}/api/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.invalid' },
      body: '{broken',
    });
    assert.equal(response.status, 410);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal((await response.json()).code, 'BROWSER_ONLY');
  });
test('bounded local request burst leaves the application responsive', async () => {
  const responses = await Promise.all(
    Array.from({ length: 24 }, () =>
      fetch(`${base}/api/upload`, { method: 'POST', body: 'synthetic'.repeat(512) }),
    ),
  );
  assert.equal(
    responses.every((r) => r.status === 410),
    true,
  );
  assert.equal((await fetch(base)).status, 200);
});
