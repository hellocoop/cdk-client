// ClientTestStack

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DnsValidatedCertificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';

import { HelloClientConstruct } from '@hellocoop/cdk-client'

// TODO
// check function.zip exists
// set redirect_uri env var if in production


const DOMAIN = 'hello-beta.net'
const HOSTNAME = 'client-test.'+DOMAIN
const CLIENT_ID = 'TBD'


export class ClientSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const helloClient = new HelloClientConstruct(this, 'HelloClient', {
      clientID: CLIENT_ID,
    });

    // create a certificate
    const zone = HostedZone.fromLookup(this, "zone", {domainName: DOMAIN})
    const certificate = new DnsValidatedCertificate( this, 'cert', {
      domainName: HOSTNAME,
      region: 'us-east-1', // for CloudFront
      validation: CertificateValidation.fromDns(zone),
      hostedZone: zone
    })

    // Create a S3 bucket
    const bucket = new s3.Bucket(this, 'bucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Upload a index.html to the S3 bucket
    new s3deploy.BucketDeployment(this, 'deploy', {
      sources: [s3deploy.Source.asset('./s3')],
      destinationBucket: bucket,
    });

    // Create a CloudFront distribution
    const distribution = new cf.Distribution(this, 'distribution', {
      domainNames: [HOSTNAME],
      certificate: certificate,
      defaultRootObject: 'index.html',
      priceClass: cf.PriceClass.PRICE_CLASS_100,
      defaultBehavior: { 
        origin: new origins.S3Origin(bucket),
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
      },
      additionalBehaviors: {
        '/api/hellocoop': {
          origin: new origins.HttpOrigin(helloClient.url, {
            protocolPolicy: cf.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cf.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cf.AllowedMethods.ALLOW_ALL,
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

  }
}