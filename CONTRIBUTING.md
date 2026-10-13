# Development guidelines

Use Node 22.13 or newer. Install with `npm ci` at the root and `npm --prefix frontend ci` for the interface. Keep both lockfiles checked in. Root tools are research/test dependencies and must not be bundled into the deployed frontend.

Run `npm run check` before merging. It builds the backend, runs adversarial and legacy tests, and builds the frontend. Run `npm run test:http` against a local production server to verify real response headers and retired endpoints. Run both package audits after dependency updates. Use the commands and manual scenarios in `docs/VALIDATION.md` for UI changes.

## Code rules

- Keep route/page files focused on composition. Put room behavior in `features/room`; keep Three.js and journey behavior in `features/journey`.
- Prefer explicit types and small functions. Validate external values before conversion or allocation; TypeScript types alone do not validate runtime inputs.
- Every sensitive asynchronous operation needs a deadline, cancellation/invalidation behavior, resource bound, and cleanup on both success and error. Never put secrets, document text, query text, or derived low-entropy hashes in logs, URLs, analytics, or blockchain calldata.
- Do not introduce `localStorage`, IndexedDB, service-worker document caching, document uploads, third-party scripts, or AI providers without revisiting the documented privacy contract.
- Do not use raw HTML rendering for file contents. Non-extractable browser keys reduce accidental export; they do not protect against malicious same-origin JavaScript or a compromised browser.
- Tests should reproduce a user-visible failure or an attack boundary: tampering, unauthorized calls, replay, quotas, invalid states, expiry races, cleanup, and failed dependencies. Avoid tests that only repeat a function's implementation.
- Keep mocks explicitly named and loopback-only. Never call a simulation receipt an attestation or a text inspection a compliance audit.
- Keep industry rules out of the shared lifecycle. Introduce a policy interface only when a real requirement exists; do not create parallel sector engines.
- Make external side effects explicit. No live deployment or transaction as part of tests. Use synthetic fixtures only.
- Format with `npm run format`; run `npm run format:check` in review. Avoid new `any` types unless an external SDK cannot be narrowed safely.

Security-sensitive changes need a review of the actual data flow and failure paths, not just a passing happy-path suite. Update `docs/SECURITY_REVIEW.md` whenever the threat model changes.
