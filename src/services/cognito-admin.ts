import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  type AttributeType,
} from "@aws-sdk/client-cognito-identity-provider";
import { config } from "../config/index";

const client = new CognitoIdentityProviderClient({ region: config.cognito.region });

/**
 * Crea un usuario en Cognito (registro por invitación) y le asigna la contraseña elegida.
 * Usa AdminCreateUser + AdminSetUserPassword para que el usuario no reciba contraseña temporal por email.
 * Devuelve el sub (id) del usuario en Cognito.
 */
export async function createCognitoUser(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<string> {
  const { email, password, firstName, lastName } = params;
  const attrs: AttributeType[] = [
    { Name: "email", Value: email },
    { Name: "email_verified", Value: "true" },
    { Name: "given_name", Value: firstName },
    { Name: "family_name", Value: lastName },
    { Name: "preferred_username", Value: email },
  ];

  const createRes = await client.send(
    new AdminCreateUserCommand({
      UserPoolId: config.cognito.userPoolId,
      Username: email,
      UserAttributes: attrs,
      TemporaryPassword: password,
      MessageAction: "SUPPRESS",
    })
  );

  const sub = createRes.User?.Attributes?.find((a) => a.Name === "sub")?.Value;
  if (!sub) throw new Error("Cognito no devolvió sub");

  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: config.cognito.userPoolId,
      Username: email,
      Password: password,
      Permanent: true,
    })
  );

  return sub;
}
