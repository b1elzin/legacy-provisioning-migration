import { describe, expect, it } from 'vitest';
import { normalizeEnvelope } from '../src/normalizer.js';

describe('message normalization', () => {
  it('maps a legacy envelope to the canonical contract', () => {
    const command = normalizeEnvelope({
      schemaVersion: 'legacy',
      jobId: 'legacy-job-001',
      action: 'ACTIVATE',
      subscriber: 'subscriber-1001',
      destination: 'provider-alpha',
    }, 'dual-read');

    expect(command).toEqual(expect.objectContaining({
      executionId: 'legacy-job-001',
      source: 'legacy',
      subscriberRef: 'subscriber-1001',
      provider: 'provider-alpha',
    }));
  });

  it('rejects legacy traffic after cutover', () => {
    expect(() => normalizeEnvelope({
      schemaVersion: 'legacy',
      jobId: 'legacy-job-002',
      action: 'BLOCK',
      subscriber: 'subscriber-2002',
      destination: 'provider-beta',
    }, 'modern-only')).toThrow('Legacy messages are no longer accepted');
  });
});
