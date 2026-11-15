import { Product } from '../domain/product';

/**
 * Build a valid Product for tests, overriding only the fields a test cares about.
 */
export const aProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  name: 'Test Product',
  pricePence: 1999,
  description: 'A great test product',
  updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  ...overrides,
});
