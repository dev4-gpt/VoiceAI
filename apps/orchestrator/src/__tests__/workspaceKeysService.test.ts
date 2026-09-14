import {
  WorkspaceKeysService,
  KeyStore,
  StoredKey,
  KeyValidationError,
  KeyStorageUnconfiguredError,
  isByokPlatform
} from '../services/workspaceKeysService';
import type { PlatformCredentials } from '../services/clientCredentialsService';

class MemoryKeyStore implements KeyStore {
  rows = new Map<string, StoredKey>();
  async list(tenantId: string) {
    return [...this.rows.entries()].filter(([key]) => key.startsWith(`${tenantId}::`)).map(([, v]) => v);
  }
  async get(tenantId: string, platform: string) {
    return this.rows.get(`${tenantId}::${platform}`)?.entry ?? null;
  }
  async upsert(tenantId: string, platform: string, entry: PlatformCredentials) {
    this.rows.set(`${tenantId}::${platform}`, { platform, entry, updatedAt: new Date('2026-09-13T12:00:00Z') });
  }
  async remove(tenantId: string, platform: string) {
    return this.rows.delete(`${tenantId}::${platform}`);
  }
}

const SECRET = 'sk-live-abcdefghijklmnop1234';

describe('WorkspaceKeysService', () => {
  let store: MemoryKeyStore;
  let service: WorkspaceKeysService;
  beforeEach(() => {
    store = new MemoryKeyStore();
    service = new WorkspaceKeysService(store, () => true);
  });

  it('saves a key and returns only the last 4 characters', async () => {
    const masked = await service.save('tenant-a', 'deepseek', { apiKey: `  ${SECRET}  ` });
    expect(masked).toEqual({
      platform: 'deepseek',
      accountHandle: null,
      last4: '••••1234',
      updatedAt: '2026-09-13T12:00:00.000Z',
      lastTest: null
    });
    expect(JSON.stringify(masked)).not.toContain('abcdefgh');
    expect((await store.get('tenant-a', 'deepseek'))?.secrets).toEqual({ apiKey: SECRET });
  });

  it("isolates workspaces: one tenant never sees another tenant's keys", async () => {
    await service.save('tenant-a', 'deepseek', { apiKey: SECRET });
    expect(await service.list('tenant-b')).toEqual([]);
    expect(await service.getSecrets('tenant-b', 'deepseek')).toBeNull();
    expect(await service.remove('tenant-b', 'deepseek')).toBe(false);
    expect(await service.list('tenant-a')).toHaveLength(1);
  });

  it('requires every field for multi-field platforms and rejects bad input', async () => {
    await expect(service.save('t', 'twitter', { apiKey: 'a', apiSecret: 'b', accessToken: 'c' })).rejects.toThrow(KeyValidationError);
    await expect(service.save('t', 'deepseek', { apiKey: SECRET, extra: 'x' })).rejects.toThrow(KeyValidationError);
    await expect(service.save('t', 'deepseek', { apiKey: '   ' })).rejects.toThrow(KeyValidationError);
    await expect(service.save('t', 'deepseek', { apiKey: 'x'.repeat(4097) })).rejects.toThrow(KeyValidationError);
    await expect(service.save('t', 'deepseek', 'nope')).rejects.toThrow(KeyValidationError);
  });

  it('reports the allowed fields on a validation error', async () => {
    try {
      await service.save('t', 'linkedin', { apiKey: SECRET });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(KeyValidationError);
      expect((err as KeyValidationError).allowedFields).toEqual(['accessToken']);
    }
  });

  it('masks short secrets completely', async () => {
    expect((await service.save('t', 'devto', { apiKey: 'short' })).last4).toBe('••••');
  });

  it('keeps an optional account handle', async () => {
    expect((await service.save('t', 'devto', { apiKey: SECRET, accountHandle: '@aryaman' })).accountHandle).toBe('@aryaman');
  });

  it('records a key test result without exposing secrets', async () => {
    await service.save('t', 'deepseek', { apiKey: SECRET });
    const result = await service.recordTest('t', 'deepseek', true);
    expect(result.ok).toBe(true);
    const [listed] = await service.list('t');
    expect(listed.lastTest).toEqual({ ok: true, testedAt: result.testedAt });
    expect(listed.last4).toBe('••••1234');
  });

  it('refuses to work when storage is not configured', async () => {
    const unready = new WorkspaceKeysService(store, () => false);
    await expect(unready.save('t', 'deepseek', { apiKey: SECRET })).rejects.toThrow(KeyStorageUnconfiguredError);
    await expect(unready.list('t')).rejects.toThrow(KeyStorageUnconfiguredError);
  });

  it('isByokPlatform accepts only the five BYOK platforms', () => {
    for (const p of ['deepseek', 'assemblyai', 'devto', 'linkedin', 'twitter']) expect(isByokPlatform(p)).toBe(true);
    for (const p of ['substack', 'youtube', 'meta', '', null, 42]) expect(isByokPlatform(p)).toBe(false);
  });
});
