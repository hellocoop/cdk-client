// HelloCoopStack

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as crypto from 'crypto';
import * as path from 'path';

import { Scope, ProviderHint } from '@hellocoop/definitions'

import { version } from '../package.json';

export { Scope, ProviderHint }

export interface HelloClientConstructProps {
  clientID: string;
  cookieSecret?: string;
  loginSyncFunctionName?: string;
  loginSyncFunctionArn?: string;
  functionName?: string;
  hostname?: string;
  helloDomain?: string;
  route?: string;
  providerHints?: ProviderHint[];
  scopes?: Scope[];
  sameSiteStrict?: boolean;
  cookieToken?: boolean;
  logDebug?: boolean;
  timeout?: cdk.Duration;
  reservedConcurrentExecutions?: number;
  // Cognito
  cognitoClientID?: string;
  cognitoClaims?: string[];
}

const zipProtocolPath = path.join(__dirname, 'protocol.zip');
const zipAuthorizerPath = path.join(__dirname, 'authorizer.zip');

export class HelloClientConstruct extends Construct {
    public readonly lambdaFunction: lambda.Function; // use this in API Gateway
    public readonly functionUrl: lambda.FunctionUrl; // use this in CloudFront
    public readonly authorizerLambda: lambda.Function; // use this in API Gateway as an authorizer

    constructor(scope: Construct, id: string, props: HelloClientConstructProps) {
        super(scope, id);

        const { region, account } = cdk.Stack.of(this);
        const loginSyncFunctionArn = props.loginSyncFunctionArn 
          || ( props.loginSyncFunctionName
                ? `arn:aws:lambda:${region}:${account}:function:${props.loginSyncFunctionName}`
                : null )
        const HELLO_COOKIE_SECRET = props.cookieSecret || crypto.randomBytes(32).toString('hex')
        const environment:{[key: string]: string;} = {
          HELLO_CDK_CLIENT_VERSION: version,
          HELLO_COOKIE_SECRET,
          HELLO_CLIENT_ID: props.clientID,
        }
        if (loginSyncFunctionArn)
          environment['LOGIN_SYNC_FUNCTION_ARN'] = loginSyncFunctionArn
        if (props.hostname) 
          environment['HELLO_HOST'] = props.hostname
        if (props.helloDomain)
          environment['HELLO_DOMAIN'] = props.helloDomain
        if (props.route) 
          environment['HELLO_API_ROUTE'] = props.route
        if (props.providerHints)
          environment['HELLO_PROVIDER_HINTS'] = props.providerHints.join(' ')
        if (props.sameSiteStrict)
          environment['HELLO_SAME_SITE_STRICT'] = 'true'
        if (props.cookieToken)
          environment['HELLO_COOKIE_TOKEN'] = 'true'    
        if (props.logDebug)
          environment['HELLO_DEBUG'] = 'true'  
        if (props.scopes) {
          environment['HELLO_SCOPES'] = props.scopes.join(' ')
          const claims = new Set(props.scopes) as Set<string>
          if (claims.has('email'))
            claims.add('email_verified')
          claims.delete('openid')
          environment['HELLO_CLAIMS'] = Array.from(claims).join(' ')
        }
        
        const functionName = props.functionName || 'HelloClient'
        this.lambdaFunction = new lambda.Function(this, functionName, {
          functionName,
          runtime: lambda.Runtime.NODEJS_20_X, 
          handler: 'index.handler',
          code: lambda.Code.fromAsset(zipProtocolPath),
          environment,
          timeout: props.timeout || cdk.Duration.seconds(30),
          reservedConcurrentExecutions: props.reservedConcurrentExecutions ?? undefined, // Default to undefined if not set
        });

        // if a loginFunctionTrigger is provided, attach a policy to the lambda function
        // Create a policy statement that grants invoke permission on the target Lambda
        if (loginSyncFunctionArn) {
          const policyStatement = new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [loginSyncFunctionArn],
          });
          // Attach the policy statement to the invoking Lambda's execution role
          this.lambdaFunction.role?.attachInlinePolicy(new iam.Policy(this, 'InvokePolicy', {
            statements: [policyStatement],
          }));
        }  

        this.functionUrl = this.lambdaFunction.addFunctionUrl({
          authType: lambda.FunctionUrlAuthType.NONE, // Publicly accessible
        })

        // Create the authorizer lambda
        const authorizerEnvironment:{[key: string]: string;} = {
          HELLO_CDK_CLIENT_VERSION: version,
          HELLO_COOKIE_SECRET,
          HELLO_CLAIMS: environment['HELLO_CLAIMS'],
        }
        if (props.logDebug)
          authorizerEnvironment['HELLO_DEBUG'] = 'true'
        if (props.cognitoClaims)
          authorizerEnvironment['COGNITO_CLAIMS'] = props.cognitoClaims.join(' ')
        if (props.cognitoClientID)
          authorizerEnvironment['COGNITO_CLIENT_ID'] = props.cognitoClientID  
  
        this.authorizerLambda = new lambda.Function(this, 'Authorizer', {
          functionName: 'HelloClientAuthorizer',
          runtime: lambda.Runtime.NODEJS_22_X,
          code: lambda.Code.fromAsset(zipAuthorizerPath),
          handler: 'index.handler',
          environment: authorizerEnvironment,
        });

    }
}
