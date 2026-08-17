import { randomUUID } from 'node:crypto';
import type { CanonicalCommand, Envelope, MigrationMode } from './contracts.js';

export class EnvelopeNotAllowedError extends Error {}

export function normalizeEnvelope(envelope: Envelope, mode: MigrationMode): CanonicalCommand {
  const isLegacy = envelope.schemaVersion === 'legacy';
  if (mode === 'legacy-only' && !isLegacy) throw new EnvelopeNotAllowedError('Modern messages are not enabled');
  if (mode === 'modern-only' && isLegacy) throw new EnvelopeNotAllowedError('Legacy messages are no longer accepted');

  if (isLegacy) {
    return {
      executionId: envelope.jobId,
      correlationId: `legacy-${randomUUID()}`,
      source: 'legacy',
      action: envelope.action,
      subscriberRef: envelope.subscriber,
      provider: envelope.destination,
      failuresBeforeSuccess: envelope.demo?.failuresBeforeSuccess ?? 0,
    };
  }

  return {
    executionId: envelope.execution.id,
    correlationId: envelope.execution.correlationId,
    source: 'modern',
    action: envelope.command.action,
    subscriberRef: envelope.command.subscriberRef,
    provider: envelope.command.provider,
    failuresBeforeSuccess: envelope.demo?.failuresBeforeSuccess ?? 0,
  };
}
