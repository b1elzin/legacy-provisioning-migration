import Fastify from 'fastify';
import { z } from 'zod';
import { envelopeSchema, migrationModes, type MigrationMode } from './contracts.js';
import { EnvelopeNotAllowedError, normalizeEnvelope } from './normalizer.js';
import { MigrationPipeline } from './pipeline.js';

export interface AppOptions {
  mode?: MigrationMode;
  maxAttempts?: number;
}

export function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  const mode = options.mode ?? z.enum(migrationModes).catch('dual-read').parse(process.env.MIGRATION_MODE);
  const pipeline = new MigrationPipeline(options.maxAttempts ?? Number(process.env.MAX_ATTEMPTS ?? 3));

  app.get('/health', async () => ({ status: 'ok', migrationMode: mode }));

  app.post('/v1/messages', async (request, reply) => {
    const parsed = envelopeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid message envelope', details: parsed.error.issues });

    try {
      const result = pipeline.process(normalizeEnvelope(parsed.data, mode));
      reply.header('x-idempotent-replay', String(result.replayed));
      return reply.code(result.replayed ? 200 : 202).send(result.record);
    } catch (error) {
      if (error instanceof EnvelopeNotAllowedError) return reply.code(409).send({ error: error.message, migrationMode: mode });
      throw error;
    }
  });

  app.get('/v1/executions', async () => pipeline.listExecutions());
  app.get('/v1/callbacks', async () => pipeline.listCallbacks());
  app.get('/v1/dead-letters', async () => pipeline.listDeadLetters());

  app.post('/v1/dead-letters/:executionId/replay', async (request, reply) => {
    const executionId = (request.params as { executionId: string }).executionId;
    const record = pipeline.replay(executionId);
    return record ?? reply.code(404).send({ error: 'Dead letter not found' });
  });

  return app;
}
