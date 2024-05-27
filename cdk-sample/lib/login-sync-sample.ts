// A test trigger lambda

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

const LOGIN_SYNC_LAMBDA = 'loginSyncSample' 

export class LoginSyncSample extends cdk.Stack {
  public readonly lambdaFunction: lambda.Function;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.lambdaFunction = new lambda.Function(this, LOGIN_SYNC_LAMBDA, {
        functionName: LOGIN_SYNC_LAMBDA,
        runtime: lambda.Runtime.NODEJS_20_X, 
        handler: 'index.handler',
        code: lambda.Code.fromAsset('lambdas/sampple-login-sync'),      
    });

    new cdk.CfnOutput(this, 'LoginSyncLambdaArn', { value: this.lambdaFunction.functionArn });
  }
}