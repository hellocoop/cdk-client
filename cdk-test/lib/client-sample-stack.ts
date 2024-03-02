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
// DnsValidatedCertificate has been marked deprecated, but no simple alternative is available
// so still using it for now
// see https://github.com/aws/aws-cdk/issues/25343
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';

import { HelloClientConstruct } from '@hellocoop/cdk-client'


const DOMAIN = 'hello-beta.net'
const HOSTNAME = 'client-test.' + DOMAIN
const CLIENT_ID = '2000a054-aa09-45a3-9f62-26e03ee9dc76'
const HELLO_API_ROUTE = '/api/hellocoop'

export class ClientSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the Hello Client Lambda and functionUrl
    const helloClient = new HelloClientConstruct(this, 'HelloClient', {
      clientID: CLIENT_ID,
      route: HELLO_API_ROUTE,
      hostname: HOSTNAME,
      providerHints: ['google'],
      scopes: ['email', 'name'],
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
      },
      additionalBehaviors: {
        HELLO_API_ROUTE: {
          origin: new origins.FunctionUrlOrigin(helloClient.functionUrl),
          viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cf.AllowedMethods.ALLOW_ALL,
          cachePolicy: cf.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: new cf.OriginRequestPolicy(this, 'hellocoop', {
            queryStringBehavior: cf.OriginRequestQueryStringBehavior.all(),
            cookieBehavior: cf.OriginRequestCookieBehavior.all(),
          }),
        },
      }
    });

    // Create a Route 53 A record to the CloudFront distribution
    new route53.ARecord(this, 'record', {
      zone: zone,
      recordName: HOSTNAME,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(distribution)
      )
    })

    // Output what we have created
    new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'WebsiteURL', { value: 'https://' + HOSTNAME });
    new cdk.CfnOutput(this, 'HelloClientLambdaUrl', { value: helloClient.functionUrl.url });
    new cdk.CfnOutput(this, 'HelloClientLambdaArn', { value: helloClient.lambdaFunction.functionArn });
  }
}