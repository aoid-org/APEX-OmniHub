/**
 * OmniHubWorkerStack — AWS CDK Stack for Lambda Heavy-Lift Compute
 * @version 1.0.0
 * @module packages/infrastructure/src/stack
 *
 * Defines the OmniHubWorkerLambda: an ARM64 Node.js 20.x function
 * designed for asynchronous heavy-lift tasks dispatched from Temporal
 * via the Asynchronous Activity Completion pattern.
 *
 * Environment injection:
 * - SUPABASE_URL and SUPABASE_ANON_KEY are read from process.env at
 *   synth time and injected into the Lambda's runtime environment.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { Construct } from 'constructs';

export class OmniHubWorkerStack extends cdk.Stack {
  public readonly workerLambda: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'];

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'OmniHubWorkerStack requires SUPABASE_URL and SUPABASE_ANON_KEY environment variables at synth time.',
      );
    }

    this.workerLambda = new lambda.Function(this, 'OmniHubWorkerLambda', {
      functionName: 'OmniHubWorkerLambda',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'worker.handler',
      code: lambda.Code.fromAsset(path.join(__dirname), {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          local: {
            tryBundle(outputDir: string): boolean {
              // esbuild bundles locally — execFileSync avoids shell interpretation (S4721)
              const entryPoint = path.join(__dirname, 'worker.ts');
              const outFile = path.join(outputDir, 'worker.js');
              execFileSync('esbuild', [
                entryPoint,
                '--bundle',
                '--platform=node',
                '--target=node20',
                `--outfile=${outFile}`,
                '--external:@temporalio/client',
                '--external:@supabase/supabase-js',
              ], { stdio: 'inherit' });
              return true;
            },
          },
        },
      }),
      memorySize: 512,
      timeout: cdk.Duration.minutes(5),
      environment: {
        SUPABASE_URL: supabaseUrl,
        SUPABASE_ANON_KEY: supabaseAnonKey,
        NODE_OPTIONS: '--enable-source-maps',
      },
      description: 'OmniHub heavy-lift worker for Temporal async activity completion',
    });

    new cdk.CfnOutput(this, 'WorkerLambdaArn', {
      value: this.workerLambda.functionArn,
      exportName: 'OmniHubWorkerLambdaArn',
      description: 'ARN of the OmniHub Worker Lambda function',
    });
  }
}
