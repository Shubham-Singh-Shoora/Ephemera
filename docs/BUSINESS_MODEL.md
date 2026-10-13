# Product and business model hypothesis

## Decision

Build one temporary document room first. Start with product teams reviewing a project with an outside consultant or researcher. The initial buyer hypothesis is the team or company that owns the information, with product/operations initiating the purchase and security/IT approving it. This is a hypothesis to validate, not evidence of existing customers or demand.

The current browser-only prototype proves a single-person workflow. It does not yet deliver the collaboration that a paying customer would need. There is no pricing, payment integration, paid tier, invitation flow, or live customer claim in the frontend.

## The people

| Person        | Their job                                   | Their reason to use the product                 | Current prototype                                           |
| ------------- | ------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| Room owner    | Choose the document and review window       | Avoid another indefinitely shared folder        | Can choose a test file, timer, and close locally            |
| Reviewer      | Find the passages needed for a bounded task | Get context without organizing another archive  | Same-browser keyword search only; no separate identity      |
| Security lead | Check handling and access boundaries        | Review enforceable controls and honest evidence | Can inspect the published limits; no compliance certificate |

The landing page follows a file through five interactive chapters: the original, growing copies, a chosen boundary, useful work, and ending access. A Three.js scene changes with clicks, sliders, and scrolling. The boundary chapter has keyboard-accessible tabs for the three intended roles. These are intended product roles, not implemented permissions.

## Potential revenue and incentives

If discovery supports the idea, charge the owning organization a workspace subscription for collaboration controls, policy management, and support. Only after confidential compute is verified, consider usage-based processing fees tied to completed work and clearly bounded resource consumption. Private deployments and integration support could serve organizations with stricter operational needs. Guests should not need to buy a subscription simply to review one document.

Do not monetize document contents, sell activity data, introduce advertising, or train models on customer material. Avoid a token economy until it solves a demonstrated customer problem. The service should earn money for useful controls and reliable operations, not for retaining more data. No prices or commercial claims are proposed for this testnet phase.

## What to learn before building commerce

1. Interview 5–8 product/project owners and their external reviewers. Ask about the last actual review: tools, copies created, access removal, and what went wrong. Do not lead with blockchain or AI.
2. Observe whether participants can open the sample, find the launch passage, identify where data lives, and close the room without help. Target at least 4 of 5 independent completions before adding features.
3. Show the explicit limitations. Ask whether expiration still has value when authorized reviewers can take screenshots. If their requirement is preventing all copies, do not promise this product can meet it.
4. Test the buyer hypothesis with a concrete proposed collaboration workflow and an expression of interest. Measure willingness to run a synthetic-data pilot before willingness to pay.
5. Compare a temporary room against simply sharing a file with an expiry date. Continue only if customers value a specific additional control enough to change their workflow.

Keep research notes free of document content. The prototype has no analytics. Any later measurement needs a documented, minimal event schema and consent where applicable.

## One room, with optional policies later

Industry folders are not security boundaries. The room lifecycle, encryption, identity checks, expiration, and resource limits should be shared. Future domain-specific validation should be an explicitly selected policy or parser behind the same room interface. Health, finance, and legal workloads require their own requirements review before support is claimed; labels alone do not make a room compliant.

## Release sequence

1. **Now:** one document, one browser, bounded local search, honest limits, adversarial tests.
2. **Next pilot:** authenticated owner/reviewer identities, per-action authorization, short-lived capabilities, minimal metadata, deletion semantics, and recovery decisions reviewed before any shared storage is introduced.
3. **Later research:** attestation-verified compute, key delivery bound to a verified enclave and job, output controls, independent security review, and availability testing. Do not treat local simulation hashes as proof.
4. **Only after validation:** commercial packaging. No pricing UI is needed to test the product or these roles.
