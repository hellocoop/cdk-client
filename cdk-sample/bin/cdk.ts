#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ClientSampleStack } from '../lib/client-sample-stack'
import { LoginSyncStack } from '../lib/login-sync-stack'
const account = process.env.CDK_DEFAULT_ACCOUNT
const region = process.env.CDK_DEFAULT_REGION
const env = { account, region }

const app = new cdk.App();

new LoginSyncStack(app, 'HelloLoginSyncStack', { env });
new ClientSampleStack(app, 'HelloClientSampleStack', { env });

