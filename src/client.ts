// HelloCoopStack

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as crypto from 'crypto';


export interface HelloClientConstructProps {
  clientID: string;
  cookieSecret?: string;
  loginTriggerFunctionName?: string;
  loginTriggerFunctionArn?: string;
}

export class HelloClientConstruct extends Construct {
    // Public properties to expose the Lambda function and URL
    public readonly lambdaFunction: lambda.Function;
    public readonly url: string;

    constructor(scope: Construct, id: string, props: HelloClientConstructProps) {
        super(scope, id);

        // if a loginFunctionTrigger is provided, attach a policy to the lambda function
        const { region, account } = cdk.Stack.of(this);
        const loginTriggerFunctionArn = props.loginTriggerFunctionArn 
          || ( props.loginTriggerFunctionName
                ? `arn:aws:lambda:${region}:${account}:function:${props.loginTriggerFunctionName}`
                : null )

        this.lambdaFunction = new lambda.Function(this, 'HelloClient', {
          functionName: 'HelloClient',
          runtime: lambda.Runtime.NODEJS_20_X, 
          handler: 'index.handler',
          code: lambda.Code.fromAsset('../protocol.zip'), 
          environment: {
            HELLO_COOKIE_SECRET: props.cookieSecret || crypto.randomBytes(32).toString('hex'),
            HELLO_CLIENT_ID: props.clientID,
            LOGIN_TRIGGER_FUNCTION_ARN: loginTriggerFunctionArn || '',
          },
        });


        // Create a policy statement that grants invoke permission on the target Lambda
        if (loginTriggerFunctionArn) {
          const policyStatement = new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [loginTriggerFunctionArn],
          });
          // Attach the policy statement to the invoking Lambda's execution role
          this.lambdaFunction.role?.attachInlinePolicy(new iam.Policy(this, 'InvokePolicy', {
            statements: [policyStatement],
          }));
        }  

        const functionUrl = this.lambdaFunction.addFunctionUrl({
          authType: lambda.FunctionUrlAuthType.NONE, // Publicly accessible
        })
        this.url = functionUrl.url

        // TODO - add in the authorize lambda function 

    }
}
