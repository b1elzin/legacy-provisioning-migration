import { z } from 'zod';

export const actions = ['ACTIVATE', 'DEACTIVATE', 'BLOCK', 'UNBLOCK'] as const;
export const providers = ['provider-alpha', 'provider-beta', 'ims-provider'] as const;
export const migrationModes = ['legacy-only', 'dual-read', 'modern-only'] as const;

export type Action = (typeof actions)[number];
export type Provider = (typeof providers)[number];
export type MigrationMode = (typeof migrationModes)[number];

const demoScenario = z.object({ failuresBeforeSuccess: z.number().int().min(0).max(10) }).optional();

export const legacyEnvelopeSchema = z.object({
  schemaVersion: z.literal('legacy'),
  jobId: z.string().min(8).max(100),
  action: z.enum(actions),
  subscriber: z.string().min(3).max(80),
  destination: z.enum(providers),
  demo: demoScenario,
});

export const modernEnvelopeSchema = z.object({
  schemaVersion: z.literal('2026-01'),
  execution: z.object({
    id: z.string().min(8).max(100),
    correlationId: z.string().min(8).max(100),
  }),
  command: z.object({
    action: z.enum(actions),
    subscriberRef: z.string().min(3).max(80),
    provider: z.enum(providers),
  }),
  demo: demoScenario,
});

export const envelopeSchema = z.discriminatedUnion('schemaVersion', [legacyEnvelopeSchema, modernEnvelopeSchema]);
export type Envelope = z.infer<typeof envelopeSchema>;

export interface CanonicalCommand {
  executionId: string;
  correlationId: string;
  source: 'legacy' | 'modern';
  action: Action;
  subscriberRef: string;
  provider: Provider;
  failuresBeforeSuccess: number;
}

export type ExecutionStatus = 'PROCESSING' | 'SUCCEEDED' | 'DEAD_LETTERED';

export interface ExecutionRecord extends CanonicalCommand {
  status: ExecutionStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

export interface TerminalCallback {
  executionId: string;
  correlationId: string;
  status: 'SUCCEEDED' | 'FAILED';
  attempts: number;
  occurredAt: string;
  error?: string;
}
