import type { CanonicalCommand, ExecutionRecord, TerminalCallback } from './contracts.js';

export class MigrationPipeline {
  private readonly executions = new Map<string, ExecutionRecord>();
  private readonly callbacks: TerminalCallback[] = [];
  private readonly deadLetters = new Map<string, ExecutionRecord>();

  constructor(private readonly maxAttempts = 3) {}

  process(command: CanonicalCommand): { record: ExecutionRecord; replayed: boolean } {
    const existing = this.executions.get(command.executionId);
    if (existing) return { record: existing, replayed: true };

    const now = new Date().toISOString();
    const record: ExecutionRecord = { ...command, status: 'PROCESSING', attempts: 0, createdAt: now, updatedAt: now };
    this.executions.set(record.executionId, record);
    this.run(record);
    return { record, replayed: false };
  }

  replay(executionId: string): ExecutionRecord | undefined {
    const record = this.deadLetters.get(executionId);
    if (!record) return undefined;
    this.deadLetters.delete(executionId);
    record.status = 'PROCESSING';
    record.lastError = undefined;
    record.failuresBeforeSuccess = 0;
    record.updatedAt = new Date().toISOString();
    this.run(record);
    return record;
  }

  listExecutions(): ExecutionRecord[] {
    return [...this.executions.values()];
  }

  listCallbacks(): TerminalCallback[] {
    return [...this.callbacks];
  }

  listDeadLetters(): ExecutionRecord[] {
    return [...this.deadLetters.values()];
  }

  private run(record: ExecutionRecord): void {
    let cycleAttempts = 0;
    while (cycleAttempts < this.maxAttempts) {
      cycleAttempts += 1;
      record.attempts += 1;
      if (record.attempts > record.failuresBeforeSuccess) {
        record.status = 'SUCCEEDED';
        record.updatedAt = new Date().toISOString();
        this.callbacks.push(this.callbackFor(record, 'SUCCEEDED'));
        return;
      }
      record.lastError = 'Synthetic downstream timeout';
    }

    record.status = 'DEAD_LETTERED';
    record.updatedAt = new Date().toISOString();
    this.deadLetters.set(record.executionId, record);
    this.callbacks.push(this.callbackFor(record, 'FAILED'));
  }

  private callbackFor(record: ExecutionRecord, status: TerminalCallback['status']): TerminalCallback {
    return {
      executionId: record.executionId,
      correlationId: record.correlationId,
      status,
      attempts: record.attempts,
      occurredAt: new Date().toISOString(),
      ...(record.lastError && status === 'FAILED' ? { error: record.lastError } : {}),
    };
  }
}
