import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.METADATA_TABLE || '';

export async function listAlgorithms(queryParams: Record<string, string | undefined>) {
  const limit = parseInt(queryParams.limit || '50', 10);
  const exclusiveStartKey = queryParams.nextToken
    ? JSON.parse(Buffer.from(queryParams.nextToken, 'base64').toString())
    : undefined;

  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    })
  );

  const nextToken = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  return {
    statusCode: 200,
    body: JSON.stringify({
      items: result.Items || [],
      nextToken,
      count: result.Count,
    }),
  };
}

export async function getAlgorithm(id: string) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { algorithmId: id, version: 'latest' },
    })
  );

  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Algorithm not found' }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.Item),
  };
}

export async function createAlgorithm(body: Record<string, unknown>) {
  const algorithmId = randomUUID();
  const now = new Date().toISOString();

  const item = {
    algorithmId,
    version: 'latest',
    ...body,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return {
    statusCode: 201,
    body: JSON.stringify(item),
  };
}

export async function updateAlgorithm(id: string, body: Record<string, unknown>) {
  const now = new Date().toISOString();

  const expressionParts: string[] = [];
  const expressionValues: Record<string, unknown> = {};
  const expressionNames: Record<string, string> = {};

  Object.entries(body).forEach(([key, value], index) => {
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;
    expressionParts.push(`${attrName} = ${attrValue}`);
    expressionNames[attrName] = key;
    expressionValues[attrValue] = value;
  });

  expressionParts.push('#updatedAt = :updatedAt');
  expressionNames['#updatedAt'] = 'updatedAt';
  expressionValues[':updatedAt'] = now;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { algorithmId: id, version: 'latest' },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify(result.Attributes),
  };
}

export async function deleteAlgorithm(id: string) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { algorithmId: id, version: 'latest' },
    })
  );

  return {
    statusCode: 204,
    body: '',
  };
}
