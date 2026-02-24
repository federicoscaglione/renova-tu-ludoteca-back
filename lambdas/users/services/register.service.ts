import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { UserItem } from "../../shared/schema";
import { ConflictError, NotFoundError, BadRequestError } from "../../shared/errors";
import * as userRepository from "../repositories/user.repository";
import * as invitationRepository from "../repositories/invitation.repository";
import type { RegisterInput } from "../validators";

const cognito = new CognitoIdentityProviderClient({});

function getUserPoolId(): string {
  const id = process.env.USER_POOL_ID;
  if (!id) throw new Error("USER_POOL_ID not set");
  return id;
}

export async function register(input: RegisterInput): Promise<{ userId: string }> {
  const invitation = await invitationRepository.getByCode(input.invitationCode);
  if (!invitation) {
    throw new NotFoundError("Invalid or expired invitation code");
  }
  if (invitation.used) {
    throw new BadRequestError("This invitation has already been used");
  }
  if (invitation.inviteeEmail.toLowerCase() !== input.email.toLowerCase()) {
    throw new BadRequestError("Email does not match the invited email address");
  }

  const existingByDni = await userRepository.getByDni(input.dni);
  if (existingByDni) {
    throw new ConflictError("A user with this DNI already exists");
  }

  const userPoolId = getUserPoolId();
  const temporaryPassword = generateTemporaryPassword();

  const createResult = await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: input.email,
      TemporaryPassword: temporaryPassword,
      UserAttributes: [
        { Name: "email", Value: input.email },
        { Name: "email_verified", Value: "true" },
        { Name: "name", Value: `${input.firstName} ${input.lastName}` },
      ],
      MessageAction: "RESEND",
    })
  );

  const sub =
    createResult.User?.Attributes?.find((a: { Name?: string; Value?: string }) => a.Name === "sub")?.Value;

  if (!sub) {
    throw new Error("Could not get user sub after AdminCreateUser");
  }

  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: input.email,
      GroupName: "normal",
    })
  );

  const now = new Date().toISOString();
  const userItem: UserItem = {
    pk: `USER#${sub}`,
    sk: `USER#${sub}`,
    userId: sub,
    dni: input.dni,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    address: input.address,
    city: input.city,
    province: input.province,
    postalCode: input.postalCode,
    role: "normal",
    createdAt: now,
  };

  await userRepository.create(userItem);
  await invitationRepository.markUsed(input.invitationCode, sub);

  return { userId: sub };
}

function generateTemporaryPassword(): string {
  const length = 12;
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const all = lower + upper + digits;
  let result = "";
  const array = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  result += lower[array[0] % lower.length];
  result += upper[array[1] % upper.length];
  result += digits[array[2] % digits.length];
  for (let i = 3; i < length; i++) {
    result += all[array[i] % all.length];
  }
  return result;
}
