import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  listAlgorithms,
  getAlgorithm,
  createAlgorithm,
  updateAlgorithm,
  deleteAlgorithm,
} from './handlers/algorithms';
import { listExecutions, getExecution, approveStep } from './handlers/workflows';
import {
  getMetrics,
  getDriftReport,
  triggerBacktest,
  getBacktestResult,
} from './handlers/monitoring';
import { triggerRollback } from './handlers/rollback';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod, resource, pathParameters, queryStringParameters, body } = event;
  const params = queryStringParameters || {};
  const parsedBody = body ? JSON.parse(body) : {};

  try {
    let result: { statusCode: number; body: string };

    switch (resource) {
      // Algorithms
      case '/algorithms':
        if (httpMethod === 'GET') {
          result = await listAlgorithms(params);
        } else if (httpMethod === 'POST') {
          result = await createAlgorithm(parsedBody);
        } else {
          result = { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
        }
        break;

      case '/algorithms/{id}':
        const algorithmId = pathParameters?.id || '';
        if (httpMethod === 'GET') {
          result = await getAlgorithm(algorithmId);
        } else if (httpMethod === 'PUT') {
          result = await updateAlgorithm(algorithmId, parsedBody);
        } else if (httpMethod === 'DELETE') {
          result = await deleteAlgorithm(algorithmId);
        } else {
          result = { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
        }
        break;

      // Workflows
      case '/workflows':
        if (httpMethod === 'GET') {
          result = await listExecutions(params);
        } else {
          result = { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
        }
        break;

      case '/workflows/{id}':
        const workflowId = pathParameters?.id || '';
        if (httpMethod === 'GET') {
          result = await getExecution(workflowId);
        } else {
          result = { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
        }
        break;

      case '/workflows/{id}/approve':
        if (httpMethod === 'POST') {
          const execId = pathParameters?.id || '';
          result = await approveStep(execId, parsedBody);
        } else {
          result = { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
        }
        break;

      // Monitoring
      case '/monitoring/metrics':
        if (httpMethod === 'GET') {
          result = await getMetrics(params);
        } else {
          result = { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
        }
        break;

      case '/monitoring/drift':
        if (httpMethod === 'GET') {
          result = await getDriftReport();
        } else {
          result = { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
        }
        break;

      case '/monitoring/backtest':
        if (httpMethod === 'POST') {
          result = await triggerBacktest(parsedBody);
        } else {
          result = { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
        }
        break;

      case '/monitoring/backtest/{id}':
        if (httpMethod === 'GET') {
          const backtestId = pathParameters?.id || '';
          result = await getBacktestResult(backtestId);
        } else {
          result = { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
        }
        break;

      // Rollback
      case '/rollback':
        if (httpMethod === 'POST') {
          result = await triggerRollback(parsedBody);
        } else {
          result = { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
        }
        break;

      default:
        result = { statusCode: 404, body: JSON.stringify({ message: 'Not found' }) };
    }

    return {
      ...result,
      headers: CORS_HEADERS,
    };
  } catch (error) {
    console.error('Request handler error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
