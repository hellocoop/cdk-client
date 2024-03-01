// ClientTestStack

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HelloClientConstruct } from '@hellocoop/cdk-client'

// TODO
// check function.zip exists
// set redirect_uri env var if in production

export class ClientTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const helloClient = new HelloClientConstruct(this, 'HelloClient', {
      clientID: 'TBD',
    });

    console.log('HelloClient URL:', helloClient.url);

  }
}