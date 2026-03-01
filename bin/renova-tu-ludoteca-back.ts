#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { RenovaTuLudotecaBackStack } from '../lib/renova-tu-ludoteca-back-stack';
import { RenovaEC2Stack } from '../lib/renova-ec2-stack';

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

new RenovaTuLudotecaBackStack(app, 'RenovaTuLudotecaBackStack', {
  env,

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

new RenovaEC2Stack(app, 'RenovaEC2Stack', { env });
