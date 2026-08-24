/**
 * Unit tests for the API handler routing logic.
 * Tests that the main handler routes requests to the correct handler functions
 * based on resource path and HTTP method.
 */

// Mock all handler modules before importing the handler
jest.mock('../../lambdas/api-handler/handlers/algorithms', () => ({
  listAlgorithms: jest.fn().mockResolvedValue({ statusCode: 200, body: '{"items":[]}' }),
  getAlgorithm: jest.fn().mockResolvedValue({ statusCode: 200, body: '{"id":"a1"}' }),
  createAlgorithm: jest.fn().mockResolvedValue({ statusCode: 201, body: '{"id":"a1"}' }),
  updateAlgorithm: jest.fn().mockResolvedValue({ statusCode: 200, body: '{"id":"a1"}' }),
  deleteAlgorithm: jest.fn().mockResolvedValue({ statusCode: 204, body: '' }),
}));

jest.mock('../../lambdas/api-handler/handlers/workflows', () => ({
  listExecutions: jest.fn().mockResolvedValue({ statusCode: 200, body: '{"executions":[]}' }),
  getExecution: jest.fn().mockResolvedValue({ statusCode: 200, body: '{"id":"w1"}' }),
  approveStep: jest.fn().mockResolvedValue({ statusCode: 200, body: '{"approved":true}' }),
}));

jest.mock('../../lambdas/api-handler/handlers/monitoring', () => ({
  getMetrics: jest.fn().mockResolvedValue({ statusCode: 200, body: '{"metrics":[]}' }),
  getDriftReport: jest.fn().mockResolvedValue({ statusCode: 200, body: '{"drift":{}}' }),
  triggerBacktest: jest.fn().mockResolvedValue({ statusCode: 202, body: '{"started":true}' }),
  getBacktestResult: jest.fn().mockResolvedValue({ statusCode: 200, body: '{"result":{}}' }),
}));

jest.mock('../../lambdas/api-handler/handlers/rollback', () => ({
  triggerRollback: jest.fn().mockResolvedValue({ statusCode: 202, body: '{"message":"initiated"}' }),
}));

import { handler } from '../../lambdas/api-handler/index';
import { listAlgorithms, getAlgorithm, createAlgorithm, updateAlgorithm, deleteAlgorithm } from '../../lambdas/api-handler/handlers/algorithms';
import { listExecutions, getExecution, approveStep } from '../../lambdas/api-handler/handlers/workflows';
import { getMetrics, getDriftReport, triggerBacktest, getBacktestResult } from '../../lambdas/api-handler/handlers/monitoring';
import { triggerRollback } from '../../lambdas/api-handler/handlers/rollback';
import type { APIGatewayProxyEvent } from 'aws-lambda';

function makeEvent(overrides: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    resource: '/',
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    headers: {},
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    body: null,
    isBase64Encoded: false,
    stageVariables: null,
    requestContext: {} as any,
    ...overrides,
  };
}

describe('API Handler Routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Algorithms routes', () => {
    test('GET /algorithms routes to listAlgorithms', async () => {
      const event = makeEvent({ resource: '/algorithms', httpMethod: 'GET' });
      const result = await handler(event, {} as any, () => {});
      expect(listAlgorithms).toHaveBeenCalled();
      expect(result).toMatchObject({ statusCode: 200 });
    });

    test('POST /algorithms routes to createAlgorithm', async () => {
      const event = makeEvent({
        resource: '/algorithms',
        httpMethod: 'POST',
        body: JSON.stringify({ name: 'test' }),
      });
      const result = await handler(event, {} as any, () => {});
      expect(createAlgorithm).toHaveBeenCalledWith({ name: 'test' });
      expect(result).toMatchObject({ statusCode: 201 });
    });

    test('GET /algorithms/{id} routes to getAlgorithm', async () => {
      const event = makeEvent({
        resource: '/algorithms/{id}',
        httpMethod: 'GET',
        pathParameters: { id: 'algo-1' },
      });
      const result = await handler(event, {} as any, () => {});
      expect(getAlgorithm).toHaveBeenCalledWith('algo-1');
      expect(result).toMatchObject({ statusCode: 200 });
    });

    test('PUT /algorithms/{id} routes to updateAlgorithm', async () => {
      const event = makeEvent({
        resource: '/algorithms/{id}',
        httpMethod: 'PUT',
        pathParameters: { id: 'algo-1' },
        body: JSON.stringify({ name: 'updated' }),
      });
      const result = await handler(event, {} as any, () => {});
      expect(updateAlgorithm).toHaveBeenCalledWith('algo-1', { name: 'updated' });
      expect(result).toMatchObject({ statusCode: 200 });
    });

    test('DELETE /algorithms/{id} routes to deleteAlgorithm', async () => {
      const event = makeEvent({
        resource: '/algorithms/{id}',
        httpMethod: 'DELETE',
        pathParameters: { id: 'algo-1' },
      });
      const result = await handler(event, {} as any, () => {});
      expect(deleteAlgorithm).toHaveBeenCalledWith('algo-1');
      expect(result).toMatchObject({ statusCode: 204 });
    });
  });

  describe('Workflow routes', () => {
    test('GET /workflows routes to listExecutions', async () => {
      const event = makeEvent({ resource: '/workflows', httpMethod: 'GET' });
      const result = await handler(event, {} as any, () => {});
      expect(listExecutions).toHaveBeenCalled();
      expect(result).toMatchObject({ statusCode: 200 });
    });

    test('GET /workflows/{id} routes to getExecution', async () => {
      const event = makeEvent({
        resource: '/workflows/{id}',
        httpMethod: 'GET',
        pathParameters: { id: 'exec-1' },
      });
      const result = await handler(event, {} as any, () => {});
      expect(getExecution).toHaveBeenCalledWith('exec-1');
      expect(result).toMatchObject({ statusCode: 200 });
    });

    test('POST /workflows/{id}/approve routes to approveStep', async () => {
      const event = makeEvent({
        resource: '/workflows/{id}/approve',
        httpMethod: 'POST',
        pathParameters: { id: 'exec-1' },
        body: JSON.stringify({ comment: 'approved' }),
      });
      const result = await handler(event, {} as any, () => {});
      expect(approveStep).toHaveBeenCalledWith('exec-1', { comment: 'approved' });
      expect(result).toMatchObject({ statusCode: 200 });
    });
  });

  describe('Monitoring routes', () => {
    test('GET /monitoring/metrics routes to getMetrics', async () => {
      const event = makeEvent({ resource: '/monitoring/metrics', httpMethod: 'GET' });
      const result = await handler(event, {} as any, () => {});
      expect(getMetrics).toHaveBeenCalled();
      expect(result).toMatchObject({ statusCode: 200 });
    });

    test('GET /monitoring/drift routes to getDriftReport', async () => {
      const event = makeEvent({ resource: '/monitoring/drift', httpMethod: 'GET' });
      const result = await handler(event, {} as any, () => {});
      expect(getDriftReport).toHaveBeenCalled();
      expect(result).toMatchObject({ statusCode: 200 });
    });

    test('POST /monitoring/backtest routes to triggerBacktest', async () => {
      const event = makeEvent({
        resource: '/monitoring/backtest',
        httpMethod: 'POST',
        body: JSON.stringify({ algorithmId: 'a1' }),
      });
      const result = await handler(event, {} as any, () => {});
      expect(triggerBacktest).toHaveBeenCalledWith({ algorithmId: 'a1' });
      expect(result).toMatchObject({ statusCode: 202 });
    });

    test('GET /monitoring/backtest/{id} routes to getBacktestResult', async () => {
      const event = makeEvent({
        resource: '/monitoring/backtest/{id}',
        httpMethod: 'GET',
        pathParameters: { id: 'bt-1' },
      });
      const result = await handler(event, {} as any, () => {});
      expect(getBacktestResult).toHaveBeenCalledWith('bt-1');
      expect(result).toMatchObject({ statusCode: 200 });
    });
  });

  describe('Rollback route', () => {
    test('POST /rollback routes to triggerRollback', async () => {
      const event = makeEvent({
        resource: '/rollback',
        httpMethod: 'POST',
        body: JSON.stringify({ endpointName: 'ep-1' }),
      });
      const result = await handler(event, {} as any, () => {});
      expect(triggerRollback).toHaveBeenCalledWith({ endpointName: 'ep-1' });
      expect(result).toMatchObject({ statusCode: 202 });
    });
  });

  describe('Error handling', () => {
    test('returns 404 for unknown routes', async () => {
      const event = makeEvent({ resource: '/unknown', httpMethod: 'GET' });
      const result = await handler(event, {} as any, () => {});
      expect(result).toMatchObject({ statusCode: 404 });
    });

    test('returns 405 for unsupported methods', async () => {
      const event = makeEvent({ resource: '/algorithms', httpMethod: 'DELETE' });
      const result = await handler(event, {} as any, () => {});
      expect(result).toMatchObject({ statusCode: 405 });
    });

    test('includes CORS headers in all responses', async () => {
      const event = makeEvent({ resource: '/algorithms', httpMethod: 'GET' });
      const result = await handler(event, {} as any, () => {});
      expect(result).toHaveProperty('headers.Access-Control-Allow-Origin', '*');
      expect(result).toHaveProperty('headers.Access-Control-Allow-Methods');
    });
  });
});
