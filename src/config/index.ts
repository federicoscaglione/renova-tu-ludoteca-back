export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID ?? "",
    region: process.env.COGNITO_REGION ?? process.env.AWS_REGION ?? "us-east-1",
  },
  cors: {
    origins: [
      "http://localhost:3000",
      "https://renovatuludoteca.com",
      "https://www.renovatuludoteca.com",
    ],
  },
} as const;
