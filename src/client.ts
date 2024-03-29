// HelloCoopStack

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as crypto from 'crypto';
import * as path from 'path';
import { Scope, ProviderHint } from '@hellocoop/types'

export { Scope, ProviderHint }

export interface HelloClientConstructProps {
  clientID: string;
  cookieSecret?: string;
  loginTriggerFunctionName?: string;
  loginTriggerFunctionArn?: string;
  functionName?: string;
  hostname?: string;
  route?: string;
  providerHints?: ProviderHint[];
  scopes?: Scope[];
  sameSiteStrict?: boolean;
  cookieToken?: boolean;
}

const zipFilePath = path.join(__dirname, 'protocol.zip');

export class HelloClientConstruct extends Construct {
    // Public properties to expose the Lambda function and URL
    public readonly lambdaFunction: lambda.Function;
    public readonly functionUrl: lambda.FunctionUrl;

    constructor(scope: Construct, id: string, props: HelloClientConstructProps) {
        super(scope, id);

        // if a loginFunctionTrigger is provided, attach a policy to the lambda function
        const { region, account } = cdk.Stack.of(this);
        const loginTriggerFunctionArn = props.loginTriggerFunctionArn 
          || ( props.loginTriggerFunctionName
                ? `arn:aws:lambda:${region}:${account}:function:${props.loginTriggerFunctionName}`
                : null )
        const environment:{[key: string]: string;} = {
          HELLO_COOKIE_SECRET: props.cookieSecret || crypto.randomBytes(32).toString('hex'),
          HELLO_CLIENT_ID: props.clientID,
        }
        if (loginTriggerFunctionArn)
          environment['LOGIN_TRIGGER_FUNCTION_ARN'] = loginTriggerFunctionArn
        if (props.hostname) 
          environment['HELLO_HOST'] = props.hostname
        if (props.route) 
          environment['HELLO_API_ROUTE'] = props.route
        if (props.providerHints)
          environment['HELLO_PROVIDER_HINTS'] = props.providerHints.join(' ')
        if (props.scopes)
          environment['HELLO_SCOPES'] = props.scopes.join(' ')
        if (props.sameSiteStrict)
          environment['HELLO_SAME_SITE_STRICT'] = 'true'
        if (props.cookieToken)
          environment['HELLO_COOKIE_TOKEN'] = 'true'          

        const functionName = props.functionName || 'HelloClient'
        this.lambdaFunction = new lambda.Function(this, functionName, {
          functionName,
          runtime: lambda.Runtime.NODEJS_20_X, 
          handler: 'index.handler',
          code: lambda.Code.fromAsset(zipFilePath), 
          environment,
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

        this.functionUrl = this.lambdaFunction.addFunctionUrl({
          authType: lambda.FunctionUrlAuthType.NONE, // Publicly accessible
        })

    }
}
