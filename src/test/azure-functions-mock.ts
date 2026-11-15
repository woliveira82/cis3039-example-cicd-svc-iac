import {
  HttpFunctionOptions,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';

/**
 * Registry of HTTP functions captured from `app.http(...)` calls, so tests can
 * invoke the (non-exported) handlers directly without the Functions host.
 */
export const registeredHttpFunctions = new Map<string, HttpFunctionOptions>();

export const appMock = {
  http: (name: string, options: HttpFunctionOptions) => {
    registeredHttpFunctions.set(name, options);
  },
};

/**
 * Look up a captured handler. Our handlers always return a plain
 * HttpResponseInit, so it is typed that way for convenient assertions.
 */
export const getHandler = (
  name: string
): ((
  request: HttpRequest,
  context: InvocationContext
) => Promise<HttpResponseInit>) => {
  const options = registeredHttpFunctions.get(name);
  if (!options) throw new Error(`No HTTP function registered as "${name}"`);
  return options.handler as (
    request: HttpRequest,
    context: InvocationContext
  ) => Promise<HttpResponseInit>;
};

/** Minimal stand-in for an HttpRequest; only what the handlers use. */
export const fakeRequest = (body?: unknown): HttpRequest =>
  ({
    json: async () => {
      if (body instanceof Error) throw body;
      return body;
    },
  }) as unknown as HttpRequest;
