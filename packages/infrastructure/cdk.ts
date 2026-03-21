#!/usr/bin/env node
/**
 * CDK App Entrypoint — OmniHub Infrastructure
 * @module packages/infrastructure/cdk
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import * as cdk from 'aws-cdk-lib';
import { OmniHubWorkerStack } from './src/stack.js';

const app = new cdk.App();

const workerStack = new OmniHubWorkerStack(app, 'OmniHubWorkerStack', {
  env: {
    account: process.env['CDK_DEFAULT_ACCOUNT'],
    region: process.env['CDK_DEFAULT_REGION'] ?? 'us-east-1',
  },
  description: 'APEX OmniHub — Lambda heavy-lift workers for Temporal async activity completion',
});

// Export stack reference for cross-stack usage
export { workerStack };

app.synth();
