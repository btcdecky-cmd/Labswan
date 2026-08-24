# Contributing to SwanLab

Thank you for contributing to SwanLab. This is infrastructure software: correctness, tenant isolation, and honest provider state matter more than adding surface area quickly.

## Development Standard

Run the quality checks before opening a pull request.

```bash
pnpm check
pnpm test
pnpm build
```

Changes that introduce a schema migration must include the generated SQL migration, describe its data impact, and avoid destructive operations unless a maintainer has explicitly approved them.

## Security and Tenancy

Do not expose service-role keys, private RPC URLs, signing secrets, session material, or plaintext API keys. New organization- or project-owned data must have an authorization path that verifies membership on the server. Client-side visibility conditions are not access control.

## Pull Requests

Use a focused title and describe the problem, implementation, authorization impact, tests, and operational considerations. Include screenshots for meaningful UI changes. Do not represent unavailable external providers as live or add fabricated customer activity, reviews, metrics, or testimonials.
