# SwanLab Solana Integration Guide

## Design

SwanLab treats Solana access as an infrastructure concern. RPC configuration is centralized in a server-only environment variable, request activity is recorded against the selected project, and browser wallet connection records only the public identity a user approves.

## Configuration

Set the full RPC endpoint as a server-only variable:

```bash
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
SOLANA_CLUSTER=mainnet-beta
```

The Solana service boundary uses `@solana/kit` to create the RPC client. If `HELIUS_RPC_URL` is absent, the application returns `not_configured`; it does not attempt an unauthenticated public fallback or present an invented health result. Helius documents RPC, enhanced APIs, webhooks, and data products in its API reference. [1]

## Current Workflows

| Workflow           | Behavior                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Cluster record     | A project member with mutation rights registers a Solana cluster resource and its provider metadata.                                     |
| RPC test           | The server issues `getHealth` through the centralized client and records status, latency, cluster, and safe detail in `solana_requests`. |
| Wallet connection  | The browser asks a compatible wallet provider for public-key approval; no private key is requested, transmitted, or stored.              |
| Request visibility | The Solana page lists recorded server RPC requests for the selected organization and project.                                            |

## Helius Webhooks

SwanLab currently stores outbound project webhook configuration and delivery history. A future Helius inbound webhook receiver should verify Helius signatures or source requirements, map the event to a project-owned address watch, write a normalized audit/monitoring event, and return quickly. Do not run lengthy processing in the incoming request path.

## Security Checklist

| Requirement      | Guidance                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| RPC key exposure | Keep `HELIUS_RPC_URL` server-only. Never export it as a browser variable.                        |
| Wallet data      | Store public address only after explicit user approval.                                          |
| Address watches  | Scope every address watch and webhook to organization and project IDs.                           |
| Transaction data | Record normalized request/event metadata, not secret-bearing configuration.                      |
| Provider failure | Save a safe status record and show `attention` or `not_configured`; do not fabricate chain data. |

## Reference

[1] [Helius API reference](https://www.helius.dev/docs/api-reference)
