import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { MetadataConstruct } from '../constructs/metadata-construct';

export class MetadataStack extends Stack {
  readonly metadataTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const metadata = new MetadataConstruct(this, 'Metadata');

    this.metadataTable = metadata.table;

    new CfnOutput(this, 'TableName', {
      value: metadata.table.tableName,
    });
  }
}
