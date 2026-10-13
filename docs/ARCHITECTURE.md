# One room architecture

## Boundaries

```text
frontend/src/app/               route composition, presentation styles, headers
frontend/src/features/journey/  Three.js scene, story, Motion transitions, Radix controls
frontend/src/features/room/     local room lifecycle, sample, and workbench
frontend/src/lib/               retired API response (no body handling)
src/crypto/                    Node research encryption and key utilities
src/swarm/                     bounded Bee client and postage arithmetic
src/dev-mock/                  loopback-only mock with quotas and deadlines
src/ai/                        legacy local retrieval and cleanup experiments
src/chainlink/                 explicitly labeled local coordinator simulation
contracts/                     simulation-only escrow coordinator
test/security/                 attack and failure-oriented regression tests
test/helpers/                  isolated in-process Hardhat chain
test-data/                     clearly fictional legacy fixtures
docs/                          product decisions, security review, validation
```

The frontend deliberately does not import the Node research code. There is no shared process-global room map, plaintext upload API, database, browser persistence, external asset host, model service, or live blockchain connection in the product path. The three previous POST routes return 410 without reading their bodies. This is a breaking API change; clients must use the local room or design a separately reviewed future service.

## Current lifecycle

The workbench accepts a UTF-8 text file (TXT, MD, CSV, JSON) of at most 256 KB or a fictional sample. File contents are treated as text, never executable markup. `RoomSession` checks sizes, names, content, and a small set of allowed durations. Web Crypto generates a non-extractable AES-GCM key and fresh 96-bit IV; only ciphertext, the key handle, and minimal metadata remain in the room object.

Search decrypts into a temporary typed array, ranks literal word matches, returns at most three bounded passages, and wipes the array in `finally`. This is keyword search, not RAG or calibrated AI confidence. React renders results as text. Rendering necessarily creates plaintext strings and DOM content, which managed runtimes cannot reliably erase from physical memory.

Closing drops the key handle, overwrites owned typed arrays, clears metadata and displayed results, and invalidates pending operations. Expiry checks both wall-clock and monotonic deadlines at access time as well as using a timer, so delayed background timers do not grant another read. Page departure closes the room. Refresh has no restore mechanism. The original file and any user-made copies remain outside the app's control.

## Scale decisions

This release scales document processing across visitors' devices; the server only serves the interface. Frontend memory is bounded per room, and the UI allows one operation at a time. Availability of the website still depends on hosting, bandwidth, and the device. Application limits are not a DDoS defense for the network edge.

Before shared rooms, introduce explicit interfaces for `RoomRepository` (minimal metadata), `CiphertextStore`, `IdentityProvider`, `AuthorizationPolicy`, and `ComputeAdapter`. Each request must reauthorize tenant, room, action, deadline, and capability scope. A room identifier or storage hash is never an access credential. Store no decryption keys beside ciphertext. Use bounded streaming, authenticated quotas, queue limits, cancellation and deadlines, replay protection, and output limits. Keep metadata retention and revocation rules independent from object-storage garbage collection.

Do not replace the removed process-local registry with another unbounded cache. A future service must choose between durability/recovery and a strict no-retention requirement explicitly. Multi-instance deployments need consistent revocation and expiration; in-memory globals cannot provide that. Do not build health/finance/legal service forks: use a shared lifecycle with versioned policies and parsers.

## Research adapters

The Bee wrapper uses the current namespaced SDK API and bounds download bytes and time; redirects are rejected. Its configured URL is trusted operator configuration and must never become an unauthenticated request parameter. Automated ingestion is limited to the local mock because real Swarm postage duration is price-dependent and cannot implement a guaranteed deletion deadline.

The coordinator has an immutable trusted simulator oracle, linked request IDs, once-only settlement, and withdrawal credits. It is not an attestation verifier or Chainlink Functions client. Its status string is fixed to prevent accidental answer publication; arbitrary hashes and references are still public, so callers must never encode secrets in them. The owner still chooses request mappings; production would require a reviewed request transport and verification model. Existing deployed contracts do not inherit these source changes.

## Accessibility and motion

Use real buttons and labels, visible keyboard focus, text error messages, and reduced-motion alternatives. The HTML journey controls remain usable without WebGL or transitions. Five scroll chapters share a sticky canvas; buttons also navigate between them. Desktop OrbitControls are only mounted in the room chapters; touch users retain vertical page scrolling. Mobile layouts reposition the scene and interactive panels. Timers are visible but are not announced every second to screen readers.
