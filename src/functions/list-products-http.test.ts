import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvocationContext } from '@azure/functions';
import { FakeProductRepo } from '../infra/fake-product-repo';
import { aProduct } from '../test/product-fixtures';

const state = vi.hoisted(() => ({ productRepo: null as FakeProductRepo | null }));

vi.mock('@azure/functions', async () => {
  const { appMock } = await import('../test/azure-functions-mock');
  return { app: appMock };
});

vi.mock('../config/appServices', () => ({
  makeListProductsDeps: () => ({ productRepo: state.productRepo }),
}));

import { getHandler, fakeRequest, registeredHttpFunctions } from '../test/azure-functions-mock';
import './list-products-http';

const context = {} as InvocationContext;
const handler = () => getHandler('listProductsHttp');

describe('listProductsHttp', () => {
  beforeEach(() => {
    state.productRepo = new FakeProductRepo();
  });

  it('should register a GET /products anonymous route', () => {
    const options = registeredHttpFunctions.get('listProductsHttp');

    expect(options).toMatchObject({
      methods: ['GET'],
      authLevel: 'anonymous',
      route: 'products',
    });
  });

  it('should return 200 with products and ISO date strings', async () => {
    // Arrange
    state.productRepo = new FakeProductRepo([
      aProduct({ id: 'p-1', updatedAt: new Date('2025-01-01T00:00:00.000Z') }),
    ]);

    // Act
    const response = await handler()(fakeRequest(), context);

    // Assert
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual([
      {
        ...aProduct({ id: 'p-1' }),
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('should return 200 with an empty array when there are no products', async () => {
    const response = await handler()(fakeRequest(), context);

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual([]);
  });

  it('should return 500 when the repository fails', async () => {
    // Arrange
    vi.spyOn(state.productRepo!, 'list').mockRejectedValue(new Error('DB down'));

    // Act
    const response = await handler()(fakeRequest(), context);

    // Assert
    expect(response.status).toBe(500);
    expect(response.jsonBody).toEqual({
      success: false,
      message: 'Failed to list products',
      error: 'DB down',
    });
  });
});
