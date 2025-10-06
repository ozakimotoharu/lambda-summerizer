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
      functionName: 'bedrockSummerizer',
      timeout: cdk.Duration.seconds(30),
      environment: {
        BEDROCK_REGION: 'us-east-1',
      },
    });
    summarizer.addToRolePolicy(new iam.PolicyStatement({
      actions: ['translate:TranslateText' ],
      resources: [ "*"]
    }));
    summarizer.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeModel'        ,
        "bedrock:InvokeModelWithResponseStream"
      ],
      resources: [ "arn:aws:bedrock:us-east-1::foundation-model/anthropic.*"]
    }));
  }
}