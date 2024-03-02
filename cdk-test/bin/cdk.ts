#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ClientSampleStack } from '../lib/client-sample-stack';

const account = process.env.CDK_DEFAULT_ACCOUNT
const region = process.env.CDK_DEFAULT_REGION
const env = { account, region }

const app = new cdk.App();
const test = new ClientSampleStack(app, 'HelloClientSampleStack', { env });

