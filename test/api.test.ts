import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

describe('migration API', () => {
  it('accepts both envelope versions during dual read', async () => {
    const app = buildApp({ mode: 'dual-read' });
    apps.push(app);
    const legacy = await app.inject({ method: 'POST', url: '/v1/messages', payload: {
      schemaVersion: 'legacy', jobId: 'legacy-api-001', action: 'ACTIVATE', subscriber: 'subscriber-1001', destination: 'provider-alpha',
    }});
    const modern = await app.inject({ method: 'POST', url: '/v1/messages', payload: {
      schemaVersion: '2026-01', execution: { id: 'modern-api-001', correlationId: 'correlation-api-001' },
      command: { action: 'BLOCK', subscriberRef: 'subscriber-2002', provider: 'provider-beta' },
    }});

    expect(legacy.statusCode).toBe(202);
    expect(modern.statusCode).toBe(202);
    expect(legacy.json().source).toBe('legacy');
    expect(modern.json().source).toBe('modern');
  });
});
