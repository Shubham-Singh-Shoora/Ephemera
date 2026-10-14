# ephemera

An interactive exploration of a shared training playground for data providers and AI teams. Travel through a Three.js world, choose a collaboration route, set up a sample agreement, and explore an illustrated training session.

This repository also contains isolated Swarm and coordinator research tools. They are simulations, not verified confidential compute or proof of worldwide deletion.

## Run locally

Requires Node 22.13 or newer.

```sh
npm ci
npm --prefix frontend ci
npm run ui
```

Open http://localhost:3000. The landing journey uses Three.js through React Three Fiber and Drei, Motion for transitions, and Radix dialogs, tabs, and sliders. It includes button and keyboard alternatives, a reduced-motion mode, and a WebGL fallback. There are no external fonts or model assets.

Choose **Find your path** to build a sample session. The landing experience is a concept: no provider is contacted, no dataset is uploaded, and no model is trained. Session choices stay in page memory and reset on reload. The older local document-search module remains isolated in the repository for its security research and tests; it is not part of the public product journey.

## Check the implementation

```sh
npm run check          # backend build, adversarial tests, legacy tests, frontend build, HTTP checks
npm test               # attack and failure scenarios, including local EVM tests
npm run format:check
npm audit
npm --prefix frontend audit
```

Legacy tests use fictional fixtures and an in-process Hardhat EVM. They do not use real funds, contact a live chain, or deploy contracts. `npm run mock-bee` starts a bounded loopback-only mock. The mock's seconds-based batches intentionally differ from real Swarm postage economics.

## Product decisions

- One shared room lifecycle; industry-specific policy can be added later without creating separate sector engines.
- Two participants: organizations providing datasets, and teams training AI models. A provider may train its own model, find a training partner, or respond to a team's data request.
- Business model remains a discovery hypothesis. No pricing or payments in the UI.
- No invitations, shared authorization, live Swarm storage, real AI inference, model training, or verified enclave execution in the browser prototype.
- Previous plaintext upload, analysis, and expiry endpoints return **410 Gone**. This is an intentional breaking change.

## Read the evidence

- [Business model and customer hypotheses](docs/BUSINESS_MODEL.md)
- [Architecture and scale decisions](docs/ARCHITECTURE.md)
- [Security findings, fixes, ratings, and remaining limits](docs/SECURITY_REVIEW.md)
- [Validation and browser test scenarios](docs/VALIDATION.md)
- [Code guidelines](CONTRIBUTING.md)

Closing a room releases the app's key and clears its owned state. It cannot erase screenshots, originals, previously made copies, or every memory trace. Swarm postage expiry is not a global deletion guarantee. The coordinator trusts an explicit simulator oracle; a simulation receipt is not hardware attestation.

## Hosting

Build the frontend with `npm run ui:build`. Prefer `frontend` as the hosting project root. The server uses per-response CSP nonces, so the route is dynamic. Deploy only synthetic-data prototypes until the production gates in the security review are met. Configure edge limits and monitoring in the hosting platform separately; application code alone does not provide DDoS protection.

No deployment is performed by the test commands. The optional Sepolia script requires an explicit simulation oracle address and rejects other chain IDs. Existing on-chain deployments are not updated by source changes.
