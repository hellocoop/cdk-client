// A test trigger lambda

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

const LOGIN_TRIGGER_FUNCTION_NAME = 'helloLoginTrigger' // this lambda defined elsewhere in another stack



const logRequest = `
exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  return { statusCode: 200, body: JSON.stringify('Hello from Lambda!') };
  };
`
export class TriggerTestStack extends cdk.Stack {
  public readonly lambdaFunction: lambda.Function;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.lambdaFunction = new lambda.Function(this, LOGIN_TRIGGER_FUNCTION_NAME, {
        functionName: LOGIN_TRIGGER_FUNCTION_NAME,
        runtime: lambda.Runtime.NODEJS_20_X, 
        handler: 'index.handler',
        code: lambda.Code.fromInline(logRequest), 
      });

    new cdk.CfnOutput(this, 'HelloClientLambdaArn', { value: this.lambdaFunction.functionArn });
  }
}