import { describe, expect, it } from 'vitest';
import type { CanonicalCommand } from '../src/contracts.js';
import { MigrationPipeline } from '../src/pipeline.js';

const command: CanonicalCommand = {
  executionId: 'execution-001',
  correlationId: 'correlation-001',
  source: 'modern',
  action: 'ACTIVATE',
  subscriberRef: 'subscriber-1001',
  provider: 'provider-alpha',
  failuresBeforeSuccess: 1,
};

describe('migration pipeline', () => {
  it('retries and reports terminal success', () => {
    const pipeline = new MigrationPipeline(3);
    const result = pipeline.process(command);

    expect(result.record).toEqual(expect.objectContaining({ status: 'SUCCEEDED', attempts: 2 }));
    expect(pipeline.listCallbacks()).toEqual([expect.objectContaining({ status: 'SUCCEEDED', attempts: 2 })]);
  });

  it('is idempotent for duplicate deliveries', () => {
    const pipeline = new MigrationPipeline(3);
    const first = pipeline.process(command);
    const duplicate = pipeline.process(command);

    expect(duplicate.replayed).toBe(true);
    expect(duplicate.record).toBe(first.record);
    expect(pipeline.listCallbacks()).toHaveLength(1);
  });

  it('dead-letters exhausted work and supports controlled replay', () => {
    const pipeline = new MigrationPipeline(3);
    pipeline.process({ ...command, executionId: 'execution-dlq-001', failuresBeforeSuccess: 5 });

    expect(pipeline.listDeadLetters()).toHaveLength(1);
    expect(pipeline.listCallbacks().at(-1)).toEqual(expect.objectContaining({ status: 'FAILED', attempts: 3 }));

    const replayed = pipeline.replay('execution-dlq-001');
    expect(replayed?.status).toBe('SUCCEEDED');
    expect(replayed?.attempts).toBe(4);
    expect(pipeline.listDeadLetters()).toHaveLength(0);
  });
});
