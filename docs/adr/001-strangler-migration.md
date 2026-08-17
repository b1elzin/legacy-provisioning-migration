# ADR 001: Incremental migration with a compatibility boundary

- Status: accepted
- Date: 2026-08-17

## Context

Multiple producers depend on a critical queue consumer. Coordinating a simultaneous contract change would increase downtime and rollback risk.

## Decision

Introduce a compatibility boundary that accepts both message versions and emits one canonical command. Migration mode controls which versions are allowed. Idempotency is evaluated after normalization so duplicates are prevented independently of the source format.

The worker reports a terminal callback on success or when retries are exhausted. Exhausted messages remain in a dead-letter store until an explicit replay.

## Consequences

- Producers migrate independently.
- The core worker is unaware of legacy transport details.
- Rollback remains possible during the dual-read window.
- The compatibility layer is temporary and must have an explicit retirement criterion.
