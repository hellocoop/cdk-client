// HelloCoopStack

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as crypto from 'crypto';
import * as path from 'path';


export interface HelloClientConstructProps {
  clientID: string;
  cookieSecret?: string;
  loginTriggerFunctionName?: string;
  loginTriggerFunctionArn?: string;
}

const zipFilePath = path.join(__dirname, 'protocol.zip');

export class HelloClientConstruct extends Construct {
    // Public properties to expose the Lambda function and URL
    public readonly lambdaFunction: lambda.Function;
    public readonly url: string;
    public readonly hostname: string;

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
          code: lambda.Code.fromAsset(zipFilePath), 
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

        this.url = this.lambdaFunction.addFunctionUrl({
          authType: lambda.FunctionUrlAuthType.NONE, // Publicly accessible
        }).url

        // const url = new URL(this.url);

        this.hostname = 'test.com' // url.hostname

        // TODO - add in the authorize lambda function 

    }
}
