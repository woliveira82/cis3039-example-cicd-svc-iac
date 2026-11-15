import { describe, it, expect } from 'vitest';
import { createProduct, ProductError } from './product';
import { aProduct } from '../test/product-fixtures';

describe('createProduct', () => {
  describe('valid product creation', () => {
    it('should create a product with valid parameters', () => {
      // Arrange
      const params = aProduct();

      // Act
      const product = createProduct(params);

      // Assert
      expect(product).toEqual(params);
    });

    it('should return a new object rather than the params object', () => {
      // Arrange
      const params = aProduct();

      // Act
      const product = createProduct(params);

      // Assert
      expect(product).not.toBe(params);
    });

    it('should allow a zero price', () => {
      // Arrange
      const params = aProduct({ pricePence: 0 });

      // Act
      const product = createProduct(params);

      // Assert
      expect(product.pricePence).toBe(0);
    });
  });

  describe('validation', () => {
    it.each([
      ['id', { id: '' }],
      ['id', { id: '   ' }],
      ['name', { name: '' }],
      ['name', { name: '   ' }],
      ['pricePence', { pricePence: -1 }],
      ['pricePence', { pricePence: 9.99 }],
      ['pricePence', { pricePence: '100' as unknown as number }],
      ['pricePence', { pricePence: Number.NaN }],
      ['description', { description: '' }],
      ['description', { description: '   ' }],
      ['updatedAt', { updatedAt: new Date('not a date') }],
      ['updatedAt', { updatedAt: '2025-01-01' as unknown as Date }],
    ])('should throw ProductError on field "%s" for %o', (field, overrides) => {
      // Arrange
      const params = aProduct(overrides);

      // Act
      const act = () => createProduct(params);

      // Assert
      expect(act).toThrow(ProductError);
      try {
        act();
      } catch (error) {
        expect((error as ProductError).field).toBe(field);
        expect((error as ProductError).name).toBe('ProductError');
      }
    });
  });
});
