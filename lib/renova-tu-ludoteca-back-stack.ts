import * as cdk from "aws-cdk-lib/core";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

/**
 * Stack that manages only Cognito (User Pool + Client).
 * Used by the Express API on EC2 and the frontend for auth.
 * Lambdas, API Gateway, and DynamoDB were removed after migration to Express + PostgreSQL.
 */
export class RenovaTuLudotecaBackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "renova-ludoteca-users",
      signInAliases: { email: true },
      autoVerify: { email: true },
      selfSignUpEnabled: false,
      standardAttributes: {
        fullname: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cognito.CfnUserPoolGroup(this, "NormalGroup", {
      userPoolId: userPool.userPoolId,
      groupName: "normal",
      description: "Usuario normal",
    });

    new cognito.CfnUserPoolGroup(this, "PremiumGroup", {
      userPoolId: userPool.userPoolId,
      groupName: "premium",
      description: "Usuario premium",
    });

    const userPoolClient = userPool.addClient("WebClient", {
      userPoolClientName: "renova-web-client",
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: "Cognito User Pool ID",
      exportName: "RenovaUserPoolId",
    });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: "Cognito App Client ID",
      exportName: "RenovaUserPoolClientId",
    });
  }
}
