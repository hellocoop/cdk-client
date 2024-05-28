#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ClientSampleStack } from '../lib/client-sample-stack'
import { LoginSyncStack } from '../lib/login-sync-stack'
const account = process.env.CDK_DEFAULT_ACCOUNT
const region = process.env.CDK_DEFAULT_REGION
const env = { account, region }

const app = new cdk.App();

const loginSyncStack = new LoginSyncStack(app, 'HelloLoginSyncStack', { env });
const clientSampleStack = new ClientSampleStack(app, 'HelloClientSampleStack', { env });

clientSampleStack.addDependency(loginSyncStack);


