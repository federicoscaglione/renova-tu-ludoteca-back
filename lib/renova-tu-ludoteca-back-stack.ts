import * as cdk from "aws-cdk-lib/core";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Construct } from "constructs";
import * as path from "path";

const bundling = { forceDockerBundling: false };
const runtime = lambda.Runtime.NODEJS_20_X;

export class RenovaTuLudotecaBackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ----- Cognito -----
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

    const authorizer = new HttpUserPoolAuthorizer(
      "CognitoAuthorizer",
      userPool,
      { userPoolClients: [userPoolClient] }
    );

    const noAuth = new apigwv2.HttpNoneAuthorizer();

    // ----- DynamoDB -----
    const gamesTable = new dynamodb.Table(this, "GamesTable", {
      tableName: "renova-games",
      partitionKey: { name: "gameId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    gamesTable.addGlobalSecondaryIndex({
      indexName: "bySeller",
      partitionKey: { name: "sellerId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
    });

    const offersTable = new dynamodb.Table(this, "OffersTable", {
      tableName: "renova-offers",
      partitionKey: { name: "offerId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    offersTable.addGlobalSecondaryIndex({
      indexName: "byGame",
      partitionKey: { name: "gameId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
    });

    const meetupsTable = new dynamodb.Table(this, "MeetupsTable", {
      tableName: "renova-meetups",
      partitionKey: {
        name: "sessionId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const participantsTable = new dynamodb.Table(this, "ParticipantsTable", {
      tableName: "renova-session-participants",
      partitionKey: { name: "sessionId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    participantsTable.addGlobalSecondaryIndex({
      indexName: "byUser",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "joinedAt", type: dynamodb.AttributeType.STRING },
    });

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      tableName: "renova-users",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    usersTable.addGlobalSecondaryIndex({
      indexName: "byDni",
      partitionKey: { name: "dni", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
    });
    usersTable.addGlobalSecondaryIndex({
      indexName: "byInviter",
      partitionKey: { name: "inviterId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
    });

    const algoliaSecret = new secretsmanager.Secret(this, "AlgoliaSecret", {
      secretName: "renova/algolia",
      description: "Algolia App ID and Admin API Key for games search",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          ALGOLIA_APP_ID: "placeholder",
          ALGOLIA_API_KEY: "placeholder",
        }),
        generateStringKey: "placeholder",
      },
    });

    const lambdasDir = path.join(__dirname, "../lambdas");

    // ----- Games Lambdas (least privilege) -----
    const gamesList = new nodeLambda.NodejsFunction(this, "GamesList", {
      entry: path.join(lambdasDir, "games/handlers/list.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: { GAMES_TABLE: gamesTable.tableName },
      timeout: cdk.Duration.seconds(10),
    });
    gamesTable.grantReadData(gamesList);

    const gamesGet = new nodeLambda.NodejsFunction(this, "GamesGet", {
      entry: path.join(lambdasDir, "games/handlers/get.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: { GAMES_TABLE: gamesTable.tableName },
      timeout: cdk.Duration.seconds(5),
    });
    gamesTable.grantReadData(gamesGet);

    const gamesCreate = new nodeLambda.NodejsFunction(this, "GamesCreate", {
      entry: path.join(lambdasDir, "games/handlers/create.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: {
        GAMES_TABLE: gamesTable.tableName,
        ALGOLIA_SECRET_ARN: algoliaSecret.secretArn,
      },
      timeout: cdk.Duration.seconds(15),
    });
    gamesTable.grantWriteData(gamesCreate);
    algoliaSecret.grantRead(gamesCreate);

    const gamesUpdate = new nodeLambda.NodejsFunction(this, "GamesUpdate", {
      entry: path.join(lambdasDir, "games/handlers/update.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: {
        GAMES_TABLE: gamesTable.tableName,
        ALGOLIA_SECRET_ARN: algoliaSecret.secretArn,
      },
      timeout: cdk.Duration.seconds(15),
    });
    gamesTable.grantReadWriteData(gamesUpdate);
    algoliaSecret.grantRead(gamesUpdate);

    const gamesDelete = new nodeLambda.NodejsFunction(this, "GamesDelete", {
      entry: path.join(lambdasDir, "games/handlers/delete.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: {
        GAMES_TABLE: gamesTable.tableName,
        ALGOLIA_SECRET_ARN: algoliaSecret.secretArn,
      },
      timeout: cdk.Duration.seconds(10),
    });
    gamesTable.grantReadWriteData(gamesDelete);
    algoliaSecret.grantRead(gamesDelete);

    // ----- Offers Lambdas -----
    const offersList = new nodeLambda.NodejsFunction(this, "OffersList", {
      entry: path.join(lambdasDir, "offers/handlers/list.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: { OFFERS_TABLE: offersTable.tableName },
      timeout: cdk.Duration.seconds(10),
    });
    offersTable.grantReadData(offersList);

    const offersGet = new nodeLambda.NodejsFunction(this, "OffersGet", {
      entry: path.join(lambdasDir, "offers/handlers/get.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: { OFFERS_TABLE: offersTable.tableName },
      timeout: cdk.Duration.seconds(5),
    });
    offersTable.grantReadData(offersGet);

    const offersCreate = new nodeLambda.NodejsFunction(this, "OffersCreate", {
      entry: path.join(lambdasDir, "offers/handlers/create.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: {
        OFFERS_TABLE: offersTable.tableName,
        GAMES_TABLE: gamesTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
    });
    offersTable.grantWriteData(offersCreate);
    gamesTable.grantReadData(offersCreate);

    const offersUpdate = new nodeLambda.NodejsFunction(this, "OffersUpdate", {
      entry: path.join(lambdasDir, "offers/handlers/update.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: { OFFERS_TABLE: offersTable.tableName },
      timeout: cdk.Duration.seconds(10),
    });
    offersTable.grantReadWriteData(offersUpdate);

    const offersDelete = new nodeLambda.NodejsFunction(this, "OffersDelete", {
      entry: path.join(lambdasDir, "offers/handlers/delete.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: { OFFERS_TABLE: offersTable.tableName },
      timeout: cdk.Duration.seconds(5),
    });
    offersTable.grantReadWriteData(offersDelete);

    // ----- Meetups Lambdas -----
    const meetupsList = new nodeLambda.NodejsFunction(this, "MeetupsList", {
      entry: path.join(lambdasDir, "meetups/handlers/list.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: { MEETUPS_TABLE: meetupsTable.tableName },
      timeout: cdk.Duration.seconds(10),
    });
    meetupsTable.grantReadData(meetupsList);

    const meetupsGet = new nodeLambda.NodejsFunction(this, "MeetupsGet", {
      entry: path.join(lambdasDir, "meetups/handlers/get.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: {
        MEETUPS_TABLE: meetupsTable.tableName,
        PARTICIPANTS_TABLE: participantsTable.tableName,
      },
      timeout: cdk.Duration.seconds(5),
    });
    meetupsTable.grantReadData(meetupsGet);
    participantsTable.grantReadData(meetupsGet);

    const meetupsCreate = new nodeLambda.NodejsFunction(this, "MeetupsCreate", {
      entry: path.join(lambdasDir, "meetups/handlers/create.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: {
        MEETUPS_TABLE: meetupsTable.tableName,
        PARTICIPANTS_TABLE: participantsTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
    });
    meetupsTable.grantWriteData(meetupsCreate);
    participantsTable.grantWriteData(meetupsCreate);

    const meetupsUpdate = new nodeLambda.NodejsFunction(this, "MeetupsUpdate", {
      entry: path.join(lambdasDir, "meetups/handlers/update.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: { MEETUPS_TABLE: meetupsTable.tableName },
      timeout: cdk.Duration.seconds(10),
    });
    meetupsTable.grantReadWriteData(meetupsUpdate);

    const meetupsDelete = new nodeLambda.NodejsFunction(this, "MeetupsDelete", {
      entry: path.join(lambdasDir, "meetups/handlers/delete.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: {
        MEETUPS_TABLE: meetupsTable.tableName,
        PARTICIPANTS_TABLE: participantsTable.tableName,
      },
      timeout: cdk.Duration.seconds(15),
    });
    meetupsTable.grantReadWriteData(meetupsDelete);
    participantsTable.grantReadWriteData(meetupsDelete);

    const meetupsJoin = new nodeLambda.NodejsFunction(this, "MeetupsJoin", {
      entry: path.join(lambdasDir, "meetups/handlers/join.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: {
        MEETUPS_TABLE: meetupsTable.tableName,
        PARTICIPANTS_TABLE: participantsTable.tableName,
      },
      timeout: cdk.Duration.seconds(5),
    });
    meetupsTable.grantReadData(meetupsJoin);
    participantsTable.grantReadWriteData(meetupsJoin);

    const meetupsLeave = new nodeLambda.NodejsFunction(this, "MeetupsLeave", {
      entry: path.join(lambdasDir, "meetups/handlers/leave.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: {
        MEETUPS_TABLE: meetupsTable.tableName,
        PARTICIPANTS_TABLE: participantsTable.tableName,
      },
      timeout: cdk.Duration.seconds(5),
    });
    meetupsTable.grantReadData(meetupsLeave);
    participantsTable.grantReadWriteData(meetupsLeave);

    // ----- Register Lambda (noAuth) -----
    const registerHandler = new nodeLambda.NodejsFunction(this, "Register", {
      entry: path.join(lambdasDir, "users/handlers/register.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: {
        USERS_TABLE: usersTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
      },
      timeout: cdk.Duration.seconds(15),
    });
    usersTable.grantReadWriteData(registerHandler);
    registerHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminAddUserToGroup",
        ],
        resources: [userPool.userPoolArn],
      })
    );

    // ----- Invitations Lambdas -----
    const invitationFromEmail = this.node.tryGetContext(
      "invitationFromEmail"
    ) as string | undefined;
    const frontendUrl = this.node.tryGetContext("frontendUrl") as
      | string
      | undefined;

    const inviteCreate = new nodeLambda.NodejsFunction(this, "InviteCreate", {
      entry: path.join(lambdasDir, "users/handlers/invite-create.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: {
        USERS_TABLE: usersTable.tableName,
        INVITATION_FROM_EMAIL: invitationFromEmail ?? "noreply@example.com",
        FRONTEND_URL: frontendUrl ?? "http://localhost:3000",
      },
      timeout: cdk.Duration.seconds(10),
    });
    usersTable.grantReadWriteData(inviteCreate);
    inviteCreate.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      })
    );

    const inviteList = new nodeLambda.NodejsFunction(this, "InviteList", {
      entry: path.join(lambdasDir, "users/handlers/invite-list.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: { USERS_TABLE: usersTable.tableName },
      timeout: cdk.Duration.seconds(5),
    });
    usersTable.grantReadData(inviteList);

    const inviteValidate = new nodeLambda.NodejsFunction(this, "InviteValidate", {
      entry: path.join(lambdasDir, "users/handlers/invite-validate.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: { USERS_TABLE: usersTable.tableName },
      timeout: cdk.Duration.seconds(5),
    });
    usersTable.grantReadData(inviteValidate);

    const meHandler = new nodeLambda.NodejsFunction(this, "Me", {
      entry: path.join(lambdasDir, "users/handlers/me.ts"),
      handler: "handler",
      runtime,
      bundling,
      environment: { USERS_TABLE: usersTable.tableName },
      timeout: cdk.Duration.seconds(5),
    });
    usersTable.grantReadData(meHandler);

    // ----- Custom domain (optional via context) -----
    const apiDomainName = this.node.tryGetContext("apiDomainName") as
      | string
      | undefined;
    const apiCertificateArn = this.node.tryGetContext("apiCertificateArn") as
      | string
      | undefined;
    let customDomain: apigwv2.DomainName | undefined;
    let hostedZone: route53.IHostedZone | undefined;
    if (apiDomainName && apiCertificateArn) {
      const cert = acm.Certificate.fromCertificateArn(
        this,
        "ApiCert",
        apiCertificateArn
      );
      customDomain = new apigwv2.DomainName(this, "ApiDomain", {
        domainName: apiDomainName,
        certificate: cert,
      });
      // Route 53: use your existing hosted zone (created manually) and manage only the api CNAME
      const baseDomain = apiDomainName.substring(apiDomainName.indexOf(".") + 1);
      const subdomain = apiDomainName.split(".")[0];
      hostedZone = route53.HostedZone.fromLookup(this, "DomainZone", {
        domainName: baseDomain,
      });
      new route53.CnameRecord(this, "ApiCname", {
        zone: hostedZone,
        recordName: subdomain,
        domainName: customDomain.regionalDomainName,
      });
    }

    // ----- API Gateway HTTP API -----
    const api = new apigwv2.HttpApi(this, "Api", {
      apiName: "renova-ludoteca-api",
      defaultDomainMapping: customDomain
        ? { domainName: customDomain }
        : undefined,
      disableExecuteApiEndpoint: !!customDomain,
      corsPreflight: {
        allowOrigins: [
          "http://localhost:3000",
          "https://renovatuludoteca.com",
          "https://www.renovatuludoteca.com",
        ],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const addRoute = (
      path: string,
      method: apigwv2.HttpMethod,
      fn: nodeLambda.NodejsFunction,
      auth: typeof authorizer | typeof noAuth
    ) => {
      api.addRoutes({
        path,
        methods: [method],
        integration: new HttpLambdaIntegration(
          `${method}${path.replace(/\//g, "").replace(/{[^}]+}/g, "Id")}`,
          fn
        ),
        authorizer: auth,
      });
    };

    // Public
    addRoute("/api/games", apigwv2.HttpMethod.GET, gamesList, noAuth);
    addRoute("/api/games/{id}", apigwv2.HttpMethod.GET, gamesGet, noAuth);
    addRoute("/api/meetups", apigwv2.HttpMethod.GET, meetupsList, noAuth);
    addRoute("/api/meetups/{id}", apigwv2.HttpMethod.GET, meetupsGet, noAuth);
    addRoute("/api/register", apigwv2.HttpMethod.POST, registerHandler, noAuth);

    // Protected - Games
    addRoute("/api/games", apigwv2.HttpMethod.POST, gamesCreate, authorizer);
    addRoute("/api/games/{id}", apigwv2.HttpMethod.PUT, gamesUpdate, authorizer);
    addRoute("/api/games/{id}", apigwv2.HttpMethod.DELETE, gamesDelete, authorizer);

    // Protected - Offers
    addRoute("/api/offers", apigwv2.HttpMethod.GET, offersList, authorizer);
    addRoute("/api/offers", apigwv2.HttpMethod.POST, offersCreate, authorizer);
    addRoute("/api/offers/{id}", apigwv2.HttpMethod.GET, offersGet, authorizer);
    addRoute("/api/offers/{id}", apigwv2.HttpMethod.PUT, offersUpdate, authorizer);
    addRoute("/api/offers/{id}", apigwv2.HttpMethod.DELETE, offersDelete, authorizer);

    // Protected - Meetups
    addRoute("/api/meetups", apigwv2.HttpMethod.POST, meetupsCreate, authorizer);
    addRoute("/api/meetups/{id}", apigwv2.HttpMethod.PUT, meetupsUpdate, authorizer);
    addRoute("/api/meetups/{id}", apigwv2.HttpMethod.DELETE, meetupsDelete, authorizer);
    addRoute(
      "/api/meetups/{id}/participants",
      apigwv2.HttpMethod.POST,
      meetupsJoin,
      authorizer
    );
    addRoute(
      "/api/meetups/{id}/participants",
      apigwv2.HttpMethod.DELETE,
      meetupsLeave,
      authorizer
    );

    // Invitations (validate is public; create/list require auth)
    addRoute(
      "/api/invitations/validate",
      apigwv2.HttpMethod.GET,
      inviteValidate,
      noAuth
    );
    addRoute("/api/invitations", apigwv2.HttpMethod.POST, inviteCreate, authorizer);
    addRoute("/api/invitations", apigwv2.HttpMethod.GET, inviteList, authorizer);

    addRoute("/api/me", apigwv2.HttpMethod.GET, meHandler, authorizer);

    new cdk.CfnOutput(this, "ApiUrl", {
      value: customDomain
        ? `https://${customDomain.name}`
        : api.apiEndpoint,
      description: "HTTP API endpoint",
      exportName: "RenovaApiUrl",
    });
    if (customDomain) {
      new cdk.CfnOutput(this, "ApiCustomDomainUrl", {
        value: `https://${customDomain.name}`,
        description: "API base URL (custom domain)",
        exportName: "RenovaApiCustomDomainUrl",
      });
      new cdk.CfnOutput(this, "ApiCustomDomainCnameTarget", {
        value: customDomain.regionalDomainName,
        description: "CNAME target for DNS (point your domain here)",
        exportName: "RenovaApiCnameTarget",
      });
    }
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
