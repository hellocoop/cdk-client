#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ClientSampleStack } from '../lib/client-sample-stack'
import { TriggerTestStack } from '../lib/trigger-test'

const account = process.env.CDK_DEFAULT_ACCOUNT
const region = process.env.CDK_DEFAULT_REGION
const env = { account, region }

const app = new cdk.App();

new TriggerTestStack(app, 'HelloTriggerTestStack', { env });
new ClientSampleStack(app, 'HelloClientSampleStack', { env });

