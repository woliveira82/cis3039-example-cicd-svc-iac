import { describe, it, expect, vi } from 'vitest';
import { listProducts } from './list-products';
import { FakeProductRepo } from '../infra/fake-product-repo';
import { aProduct } from '../test/product-fixtures';

describe('listProducts', () => {
  it('should return empty array when no products exist', async () => {
    // Arrange
    const productRepo = new FakeProductRepo();

    // Act
    const result = await listProducts({ productRepo });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('should return all products from the repository', async () => {
    // Arrange
    const products = [
      aProduct({ id: 'prod-1', name: 'Product 1' }),
      aProduct({ id: 'prod-2', name: 'Product 2' }),
    ];
    const productRepo = new FakeProductRepo(products);

    // Act
    const result = await listProducts({ productRepo });

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data).toEqual(products);
  });

  describe('error scenarios', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      const productRepo = new FakeProductRepo();
      vi.spyOn(productRepo, 'list').mockRejectedValue(new Error('DB down'));

      // Act
      const result = await listProducts({ productRepo });

      // Assert
      expect(result).toEqual({ success: false, error: 'DB down' });
    });
  });
});
