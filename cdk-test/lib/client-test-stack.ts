// ClientTestStack

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { HelloClientConstruct } from '@hellocoop/cdk-client'

// TODO
// check function.zip exists
// set redirect_uri env var if in production

export class ClientTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const helloClient = new 

    // Define the Lambda function
    const helloLambda = new lambda.Function(this, 'HelloCoop', {
      functionName: 'HelloCoop',
      runtime: lambda.Runtime.NODEJS_20_X, 
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../src/lambda.zip'), 
      environment: {
        HELLO_COOKIE_SECRET: crypto.randomBytes(32).toString('hex'),
        // HELLO_CLIENT_ID: 'YOUR_HELLO_CLIENT_ID',
      },
    });

            
    // ARN of the target Lambda function you want to invoke
    // TODO - get the ARN of the target Lambda function
    const targetLambdaArn = null // 'arn:aws:lambda:region:account-id:function:target-lambda-name';

    if (targetLambdaArn) {
      // Create a policy statement that grants invoke permission on the target Lambda
      const policyStatement = new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: [targetLambdaArn],
      });
      // Attach the policy statement to the invoking Lambda's execution role
      helloLambda.role?.attachInlinePolicy(new iam.Policy(this, 'InvokePolicy', {
        statements: [policyStatement],
      }));
    }

    const helloLambdaUrl = helloLambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE, // Publicly accessible
    });

    // Output the URL to the CloudFormation output
    new cdk.CfnOutput(this, 'LambdaFunctionUrl', {
      value: helloLambdaUrl.url,
    });
  }
}