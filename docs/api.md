# SwanLab Internal API Guide

SwanLab uses tRPC procedures as its internal typed API. This avoids duplicating request/response contracts across the client and server. No procedure accepts organization or project identifiers as proof of access; every scoped procedure performs a server-side membership check.

## Workspace Procedures

| Procedure                 | Input                      | Result                              | Role requirement        |
| ------------------------- | -------------------------- | ----------------------------------- | ----------------------- |
| `workspace.list`          | None                       | User-visible organizations          | Authenticated user      |
| `workspace.create`        | `{ name }`                 | New organization + owner membership | Authenticated user      |
| `workspace.projects`      | `{ organizationId }`       | Organization projects               | Member                  |
| `workspace.createProject` | `{ organizationId, name }` | New project                         | Owner, admin, developer |

## Project Operations

| Namespace       | Operation                             | Purpose                                                                     |
| --------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| `resources`     | `list`, `create`                      | Database, network, Solana cluster, wallet, and environment records.         |
| `developer`     | API-key procedures                    | List, create one-time secret, and revoke project-scoped keys.               |
| `developer`     | Webhook procedures                    | Register signed endpoints, list delivery records, and inspect audit events. |
| `observability` | `monitoring`, `usage`                 | Read project-scoped aggregates.                                             |
| `alerts`        | `list`, `create`, `testOwnerDelivery` | Configure threshold policy records and safely test owner delivery.          |
| `solana`        | `testRpc`, `requests`                 | Test configured RPC and list server-recorded request activity.              |

## API-Key Lifecycle

1. A permitted member submits a label and allowed scopes.
2. The server generates an `sl_live_` secret with cryptographic randomness.
3. Only a SHA-256 hash and safe prefix are persisted.
4. The plaintext secret returns once and the browser copies it on creation.
5. Revocation records a timestamp and audit event; it never relies on client-side hiding alone.

## Webhook Lifecycle

Webhook endpoints persist an HTTPS URL, selected event types, status, and hash of a one-time signing secret. Delivery history is separate from endpoint configuration so an operator can distinguish a configured endpoint from observed delivery outcomes.

## Error Semantics

| Error class           | Meaning                                     | Client behavior                                            |
| --------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| `UNAUTHORIZED`        | No authenticated user.                      | Launch sign-in flow.                                       |
| `FORBIDDEN`           | User lacks organization membership or role. | Explain access boundary without leaking resource data.     |
| `PRECONDITION_FAILED` | Storage or required context is unavailable. | Ask for workspace/project or provider configuration.       |
| Provider status value | Provider is unavailable or unconfigured.    | Present a visible setup state rather than a generic error. |
