/*
aws-cdk-lib/aws-lambda-nodejsを使うときには

npm install --save-dev esbuild

が必要
*/

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class LambdaSummerizerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const summarizer = new lambdaNodejs.NodejsFunction(this, 'MessageSummarizer', {
      entry: path.join(__dirname, '../lambda/index.ts'), // TypeScriptファイルのパス
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        BEDROCK_REGION: 'us-east-1',
        MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
      },
    });

    summarizer.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'], // 必要に応じてモデルARNで絞り込み可能
    }));
  }
}