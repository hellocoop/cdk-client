// ClientSampleStack is a CDK stack that creates Hello Client Lambda function and then shows how it can be used 
// in a CloudFront distribution with an S3 bucket

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

// DnsValidatedCertificate has been marked deprecated, but no simple alternative is available
// so still using it for now
// see https://github.com/aws/aws-cdk/issues/25343
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';

import { HelloClientConstruct, Scope, ProviderHint  } from '@hellocoop/cdk-client'

/*
  Update the following constants to match your environment
*/
// The domain name you will be using
const DOMAIN = 'hello-beta.net'
const HOSTNAME = 'client-test.' + DOMAIN
// Your Hellō cleint_id from https://console.hello.coop
const CLIENT_ID = '2000a054-aa09-45a3-9f62-26e03ee9dc76'

/*
  Optional: Update the following constants to match your circumstances
*/
// The route that the Hello Client Lambda will be available at
const HELLO_API_ROUTE = '/api/hellocoop' // this is the default value

// optionally override the default value - see https://www.hello.dev/docs/apis/wallet/#provider_hint
const PROVIDER_HINTS: ProviderHint[] = ['github','apple--'] // add github, and demote apple

// optionally override the default value - see https://www.hello.dev/docs/scopes/
const SCOPES: Scope[] = ['openid', 'email', 'name', 'picture'] // this is the default value


export class ClientSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import the LoginSync Lambda ARN created in the LoginSyncStack
    const loginSyncFunctionArn = cdk.Fn.importValue('LoginSyncLambdaArn');


    // Create the Hello Client Lambda and functionUrl
    const helloClient = new HelloClientConstruct(this, 'HelloClient', {
      clientID: CLIENT_ID,            // required
      // hostname: HOSTNAME,             // recommended
      // route: HELLO_API_ROUTE,         // optional
      providerHints: PROVIDER_HINTS,  // optional
      scopes: SCOPES,                 // optional
      loginSyncFunctionArn,           // optional
      cookieToken: true,              // optional - default is false, returns the token in a cookie with op=auth
      logDebug: true,                 // optional - default is false, logs debug information
    });


    // create a certificate
    const zone = HostedZone.fromLookup(this, "zone", { domainName: DOMAIN })

    const certificate = new DnsValidatedCertificate(this, 'cert', {
      domainName: HOSTNAME,
      region: 'us-east-1', // for CloudFront
      validation: CertificateValidation.fromDns(zone),
      hostedZone: zone
    })

    // Create a S3 bucket
    const bucket = new s3.Bucket(this, 'bucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Upload a index.html to the S3 bucket
    new s3deploy.BucketDeployment(this, 'deploy', {
      sources: [s3deploy.Source.asset('./s3')],
      destinationBucket: bucket,
    });


    // Create a CloudFront distribution
    const distribution = new cf.Distribution(this, 'distribution', {
      domainNames: [HOSTNAME],
      certificate,
      defaultRootObject: 'index.html',
      priceClass: cf.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: new origins.S3Origin(bucket),
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
      }
    });

    // add behavior for the Hello Client Lambda
    distribution.addBehavior(HELLO_API_ROUTE, new origins.FunctionUrlOrigin(helloClient.functionUrl), {
      viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: cf.AllowedMethods.ALLOW_ALL,
      cachePolicy: cf.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: new cf.OriginRequestPolicy(this, 'hellocoop', {
        queryStringBehavior: cf.OriginRequestQueryStringBehavior.all(),
        cookieBehavior: cf.OriginRequestCookieBehavior.all(),
      }),
    });

    // Create a Route 53 A record to the CloudFront distribution
    new route53.ARecord(this, 'record', {
      zone: zone,
      recordName: HOSTNAME,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(distribution)
      )
    })




/*
    The following code shows how to use the authorizer in an API Gateway
*/
    // Create a CloudFront cache policy for the API that forwards the Authorization header
    const apiCachePolicy = new cf.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: 'ApiCachePolicy',
      headerBehavior: cf.CacheHeaderBehavior.allowList('Authorization'),
      queryStringBehavior: cf.CacheQueryStringBehavior.all(),
      cookieBehavior: cf.CacheCookieBehavior.all(),
      maxTtl: cdk.Duration.seconds(0),
    })

    // The Lambda function for the sample API
    const sampleApiLambda = new lambda.Function(this, 'SampleApiLambda', {
      functionName: 'SampleApiLambda',
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('lambdas/sample-api'),
      handler: 'index.handler',
    });

    // The Lambda function for the authorizer
    const authorizerLambda = new lambda.Function(this, 'AuthorizerLambda', {
      functionName: 'AuthorizerLambda',
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('lambdas/authorizer'),
      handler: 'index.handler',
    });

    // Create the API Gateway
    const api = new apigateway.RestApi(this, 'SampleApi', {
      restApiName: 'Sample Service',
      description: 'This service serves sample data.',
    });

    // Create a Lambda authorizer
    const lambdaAuthorizer = new apigateway.TokenAuthorizer(this, 'LambdaAuthorizer', {
      handler: helloClient.authorizerLambda,
    });

    // Create a resource and method for the sample API
    const sampleResource = api.root.addResource('sample');
    const sampleIntegration = new apigateway.LambdaIntegration(sampleApiLambda);
    sampleResource.addMethod('GET', sampleIntegration, {
      authorizer: lambdaAuthorizer,
    });

    // Add the API Gateway as an additional behavior to CloudFront
    distribution.addBehavior('/sample', new origins.HttpOrigin(`${api.restApiId}.execute-api.${this.region}.amazonaws.com`, {
      originPath: '/prod',
    }), {
      viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
      allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
      cachePolicy: apiCachePolicy,
      originRequestPolicy: new cf.OriginRequestPolicy(this, 'ApiOriginRequestPolicySample', {
        queryStringBehavior: cf.OriginRequestQueryStringBehavior.all(),
        cookieBehavior: cf.OriginRequestCookieBehavior.all(),
      }),    
    });

    // Output what we have created
    new cdk.CfnOutput(this, 'DistributionId', { exportName: 'HelloSampleClientDistributionId', value: distribution.distributionId });
    new cdk.CfnOutput(this, 'BucketName', { exportName: 'HelloSampleClientBucket', value: bucket.bucketName });
    new cdk.CfnOutput(this, 'WebsiteURL', { value: 'https://' + HOSTNAME });
    new cdk.CfnOutput(this, 'HelloClientLambdaUrl', { value: helloClient.functionUrl.url });
    new cdk.CfnOutput(this, 'HelloClientLambdaArn', { value: helloClient.lambdaFunction.functionArn });
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'AuthorizerLambdaArn', { value: helloClient.authorizerLambda.functionArn });
    new cdk.CfnOutput(this, 'SampleApiLambdaArn', { value: sampleApiLambda.functionArn });
  }
}