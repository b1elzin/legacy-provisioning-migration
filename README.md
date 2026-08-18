# legacy-provisioning-migration

Provider-integration modernization POC. It models the move from separate legacy provisioning paths to a shared contract without coordinating a big-bang release across every producer.

The consumer accepts two envelopes, maps both to the same command and keeps the worker unaware of transport-version details.

## Message boundary

Legacy input:

```json
{
  "schemaVersion": "legacy",
  "jobId": "legacy-job-001",
  "action": "BLOCK",
  "subscriber": "subscriber-1001",
  "destination": "provider-beta"
}
```

Modern input:

```json
{
  "schemaVersion": "2026-01",
  "execution": {
    "id": "execution-001",
    "correlationId": "correlation-001"
  },
  "command": {
    "action": "BLOCK",
    "subscriberRef": "subscriber-1001",
    "provider": "provider-beta"
  }
}
```

Both become a `CanonicalCommand` before idempotency and processing are evaluated.

## Migration modes

Set `MIGRATION_MODE` to one of:

- `legacy-only`: baseline before modern producers are enabled;
- `dual-read`: migration window, accepts both contracts;
- `modern-only`: cutover completed, rejects legacy traffic.

## Run and test

```bash
npm install
npm run dev
npm test
```

The API listens on `http://localhost:3002`.

```text
POST /v1/messages
GET  /v1/executions
GET  /v1/callbacks
GET  /v1/dead-letters
POST /v1/dead-letters/:executionId/replay
```

`demo.failuresBeforeSuccess` is only a test hook. A value above `MAX_ATTEMPTS` sends the record to the in-memory dead-letter store. Replay starts a new retry cycle but preserves the accumulated attempt count.

## What is deliberately missing

- A real broker and DLQ. The current stores live in one process.
- Distributed idempotency and message locking.
- Backoff/jitter between attempts.
- Authentication on the replay endpoint.

The interesting part of this repository is the compatibility boundary, gradual cutover and safe retirement of the legacy consumer—not the HTTP wrapper. See [ADR 001](docs/adr/001-strangler-migration.md).
