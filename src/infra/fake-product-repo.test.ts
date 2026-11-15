import { describe, it, expect } from 'vitest';
import { FakeProductRepo } from './fake-product-repo';
import { aProduct } from '../test/product-fixtures';

describe('FakeProductRepo', () => {
  it('should be empty by default', async () => {
    const repo = new FakeProductRepo();

    expect(await repo.list()).toEqual([]);
  });

  it('should list initial products', async () => {
    const products = [aProduct({ id: 'a' }), aProduct({ id: 'b' })];
    const repo = new FakeProductRepo(products);

    expect(await repo.list()).toEqual(products);
  });

  it('should return null from getById when product does not exist', async () => {
    const repo = new FakeProductRepo();

    expect(await repo.getById('missing')).toBeNull();
  });

  it('should insert a new product on save', async () => {
    const repo = new FakeProductRepo();
    const product = aProduct({ id: 'new' });

    const saved = await repo.save(product);

    expect(saved).toEqual(product);
    expect(await repo.getById('new')).toEqual(product);
  });

  it('should update an existing product on save', async () => {
    const repo = new FakeProductRepo([aProduct({ id: 'p', name: 'Old' })]);

    await repo.save(aProduct({ id: 'p', name: 'New' }));

    expect(await repo.list()).toHaveLength(1);
    expect((await repo.getById('p'))?.name).toBe('New');
  });

  it('should delete a product, and be a no-op for unknown ids', async () => {
    const repo = new FakeProductRepo([aProduct({ id: 'p' })]);

    await repo.delete('p');
    await repo.delete('unknown');

    expect(await repo.list()).toEqual([]);
  });

  it('should not expose internal state to external mutation', async () => {
    const initial = aProduct({ id: 'p', name: 'Original' });
    const repo = new FakeProductRepo([initial]);

    initial.name = 'Mutated initial';
    const fetched = await repo.getById('p');
    fetched!.name = 'Mutated fetched';
    (await repo.list())[0].name = 'Mutated listed';

    expect((await repo.getById('p'))?.name).toBe('Original');
  });
});
