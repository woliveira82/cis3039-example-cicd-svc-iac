import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvocationContext } from '@azure/functions';
import { FakeProductRepo } from '../infra/fake-product-repo';

const fixedNow = new Date('2025-06-01T12:00:00.000Z');
const state = vi.hoisted(() => ({ productRepo: null as FakeProductRepo | null }));

vi.mock('@azure/functions', async () => {
  const { appMock } = await import('../test/azure-functions-mock');
  return { app: appMock };
});

vi.mock('../config/appServices', () => ({
  makeUpsertProductDeps: () => ({
    productRepo: state.productRepo,
    now: () => fixedNow,
  }),
}));

import { getHandler, fakeRequest, registeredHttpFunctions } from '../test/azure-functions-mock';
import './upsert-product-http';

const context = {} as InvocationContext;
const handler = () => getHandler('upsertProductHttp');

const validBody = {
  id: 'prod-1',
  name: 'Widget',
  pricePence: 1299,
  description: 'A useful widget',
};

describe('upsertProductHttp', () => {
  beforeEach(() => {
    state.productRepo = new FakeProductRepo();
  });

  it('should register a PUT/POST /products anonymous route', () => {
    expect(registeredHttpFunctions.get('upsertProductHttp')).toMatchObject({
      methods: ['PUT', 'POST'],
      authLevel: 'anonymous',
      route: 'products',
    });
  });

  it('should return 200 with the saved product and persist it', async () => {
    // Act
    const response = await handler()(fakeRequest(validBody), context);

    // Assert
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({
      ...validBody,
      updatedAt: fixedNow.toISOString(),
    });
    expect(await state.productRepo!.getById('prod-1')).toEqual({
      ...validBody,
      updatedAt: fixedNow,
    });
  });

  it('should accept a zero price', async () => {
    const response = await handler()(
      fakeRequest({ ...validBody, pricePence: 0 }),
      context
    );

    expect(response.status).toBe(200);
  });

  describe('bad requests', () => {
    it.each([null, 'not an object', 42])(
      'should return 400 when body is %o',
      async (body) => {
        const response = await handler()(fakeRequest(body), context);

        expect(response.status).toBe(400);
        expect(response.jsonBody).toEqual({
          success: false,
          message: 'Request body is required',
        });
      }
    );

    it.each(['id', 'name', 'pricePence', 'description'])(
      'should return 400 when "%s" is missing',
      async (field) => {
        const body: Record<string, unknown> = { ...validBody };
        delete body[field];

        const response = await handler()(fakeRequest(body), context);

        expect(response.status).toBe(400);
        expect(response.jsonBody).toEqual({
          success: false,
          message: 'Missing required fields: id, name, pricePence, description',
        });
      }
    );

    it('should return 400 when domain validation fails', async () => {
      const response = await handler()(
        fakeRequest({ ...validBody, pricePence: -1 }),
        context
      );

      expect(response.status).toBe(400);
      expect(response.jsonBody).toMatchObject({
        success: false,
        message: 'Failed to upsert product',
      });
      expect(await state.productRepo!.list()).toEqual([]);
    });
  });

  it('should return 500 when the body cannot be parsed', async () => {
    const response = await handler()(
      fakeRequest(new SyntaxError('Unexpected token')),
      context
    );

    expect(response.status).toBe(500);
    expect(response.jsonBody).toEqual({
      success: false,
      message: 'Internal server error',
      error: 'Unexpected token',
    });
  });
});
