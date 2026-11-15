import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getProductRepo,
  makeListProductsDeps,
  makeUpsertProductDeps,
} from './appServices';

describe('appServices', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the same seeded repository instance every time', async () => {
    const repo = getProductRepo();

    expect(getProductRepo()).toBe(repo);
    const ids = (await repo.list()).map((p) => p.id);
    expect(ids).toEqual(['p-001', 'p-002']);
  });

  it('should wire list and upsert deps to the shared repository', () => {
    expect(makeListProductsDeps().productRepo).toBe(getProductRepo());
    expect(makeUpsertProductDeps().productRepo).toBe(getProductRepo());
  });

  it('should provide a now() that returns the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));

    expect(makeUpsertProductDeps().now()).toEqual(
      new Date('2030-01-01T00:00:00.000Z')
    );
  });
});
