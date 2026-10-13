# Validation

## Automated checks

`npm run check` runs the backend TypeScript build, adversarial regressions, original lifecycle suites, production frontend build, and HTTP security checks against a temporary local production server. The contract tests run in an isolated Hardhat EVM. `npm run format:check` enforces the shared formatter configuration. Run audits in both package directories after updating dependencies.

Coverage includes authenticated encryption tampering and malformed envelopes; strict file/duration/query bounds; empty, binary, oversized and Unicode input; session isolation; exact expiry; clock rollback; close-during-encryption/decryption races; concurrent opens; cleanup after an injected indexing failure; cyclic buffer disposal; retired APIs refusing body parsing; local mock quotas and health at capacity; unauthorized contract callbacks, request relinking, replay, empty receipts, private result text, refund timing and failed withdrawals; bounded copy interactions and valid chapter calculation; nonce/cache/frame/privacy headers and a bounded local request burst.

The legacy tests now have explicit fictional fixtures, updated SDK compatibility and an isolated local EVM. Test output is not a certificate of TEE execution, compliance or physical deletion.

## Browser observations and limits

The preceding interface was manually checked at desktop and narrow mobile sizes: sample creation, local search, closing and result cleanup, interactive illustration, and zero horizontal overflow. It had no console errors during those checks.

The replacement **ephemera** Three.js journey was implemented after that walkthrough. Browser automation was blocked by automatic approval review reporting an account usage limit. Consequently, the new WebGL rendering, visual transitions, dialog focus behavior, touch layout and motion pause controls have **not** been visually reverified. Production build/type checks and the automated suites do not replace that verification. No deployment or claim of production readiness follows from these checks.

## Browser acceptance checklist for the new journey

1. At 1440×1000, 1024×768 and 390×844, start at the sparse opening canvas. Check the ephemera identity, outlined path, readable text and no overlap or horizontal overflow.
2. Click the 3D file or “Follow the file.” Add copies repeatedly. Confirm the illustrated documents and ledger stop at eight; the interface remains responsive.
3. Scroll in both directions and use every chapter stop and arrow. Confirm each composition changes, the active chapter matches, and standard page scrolling is available.
4. Set each boundary duration. Toggle the boundary and rotate the desktop model. On touch devices, vertical scrolling must remain available. Switch each intended customer role using pointer and arrow keys.
5. Select every sample question. Confirm the correct fictional passage, source label and a clear distinction from the working local search.
6. Scrub the illustrated session to 100% or choose “Let it end.” Confirm the room disappears, closure copy retains the limits, and replay resets copies, passage, boundary and elapsed time.
7. Turn motion off and enable the OS reduced-motion setting. Check no continuous floating or animated layout changes; all actions remain usable.
8. Test without WebGL2. The fallback document and all HTML actions should remain usable.
9. Open the real room by pointer and keyboard. Verify focus containment, Escape/close behavior, return focus and loss of room access on close. Test sample and a non-sensitive file, missing keywords, unsupported formats, oversized and empty input, timer expiry, refresh and reopened sessions.
10. Inspect network and console output: no document/query transmission, no remote font/model requests, no CSP or WebGL errors. Confirm local room content is rendered as text, including markup-like content.
11. Open the limits dialog. Check readability, focus, dismiss controls and honest treatment of single-user access, lack of real AI and original-file retention.

A 24-request local HTTP burst only checks bounded behavior. It is not an availability benchmark, hosting audit or DDoS test.
