import { describe, it, expect, vi } from 'vitest';
import { upsertProduct, UpsertProductCommand } from './upsert-product';
import { FakeProductRepo } from '../infra/fake-product-repo';
import { aProduct } from '../test/product-fixtures';

const fixedNow = new Date('2025-06-01T12:00:00.000Z');

const aCommand = (
  overrides: Partial<UpsertProductCommand> = {}
): UpsertProductCommand => ({
  id: 'prod-1',
  name: 'Widget',
  pricePence: 1299,
  description: 'A useful widget',
  ...overrides,
});

describe('upsertProduct', () => {
  it('should create a new product stamped with the current time', async () => {
    // Arrange
    const productRepo = new FakeProductRepo();
    const command = aCommand();

    // Act
    const result = await upsertProduct({ productRepo, now: () => fixedNow }, command);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ...command, updatedAt: fixedNow });
    expect(await productRepo.getById(command.id)).toEqual(result.data);
  });

  it('should update an existing product', async () => {
    // Arrange
    const productRepo = new FakeProductRepo([
      aProduct({ id: 'prod-1', name: 'Old name' }),
    ]);

    // Act
    const result = await upsertProduct(
      { productRepo, now: () => fixedNow },
      aCommand({ id: 'prod-1', name: 'New name' })
    );

    // Assert
    expect(result.success).toBe(true);
    const stored = await productRepo.getById('prod-1');
    expect(stored?.name).toBe('New name');
    expect(stored?.updatedAt).toEqual(fixedNow);
    expect(await productRepo.list()).toHaveLength(1);
  });

  describe('error scenarios', () => {
    it('should return a validation error and not save an invalid product', async () => {
      // Arrange
      const productRepo = new FakeProductRepo();
      const save = vi.spyOn(productRepo, 'save');

      // Act
      const result = await upsertProduct(
        { productRepo, now: () => fixedNow },
        aCommand({ pricePence: -5 })
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/pricePence/);
      expect(save).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const productRepo = new FakeProductRepo();
      vi.spyOn(productRepo, 'save').mockRejectedValue(new Error('DB down'));

      // Act
      const result = await upsertProduct(
        { productRepo, now: () => fixedNow },
        aCommand()
      );

      // Assert
      expect(result).toEqual({ success: false, error: 'DB down' });
    });
  });
});
