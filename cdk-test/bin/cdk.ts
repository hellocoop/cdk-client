#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ClientTestStack } from '../lib/client-test-stack';


const app = new cdk.App();
new ClientTestStack(app, 'ClientTestStack');
