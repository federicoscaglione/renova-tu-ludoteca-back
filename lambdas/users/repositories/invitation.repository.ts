import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { InvitationItem } from "../../shared/schema";

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);

export function getTableName(): string {
  const name = process.env.USERS_TABLE;
  if (!name) throw new Error("USERS_TABLE not set");
  return name;
}

function invitationPkSk(code: string): { pk: string; sk: string } {
  return {
    pk: `INVITATION#${code}`,
    sk: `INVITATION#${code}`,
  };
}

export async function getByCode(
  code: string
): Promise<InvitationItem | null> {
  const { pk, sk } = invitationPkSk(code);
  const { Item } = await doc.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { pk, sk },
    })
  );
  return (Item as InvitationItem) ?? null;
}

export async function create(invitation: InvitationItem): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: getTableName(),
      Item: invitation,
    })
  );
}

export async function markUsed(code: string, usedBy: string): Promise<void> {
  const { pk, sk } = invitationPkSk(code);
  await doc.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: { pk, sk },
      UpdateExpression: "SET #used = :used, usedBy = :usedBy",
      ExpressionAttributeNames: { "#used": "used" },
      ExpressionAttributeValues: { ":used": true, ":usedBy": usedBy },
    })
  );
}

export async function listByInviter(
  inviterId: string
): Promise<InvitationItem[]> {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: "byInviter",
      KeyConditionExpression: "inviterId = :inviterId",
      ExpressionAttributeValues: { ":inviterId": inviterId },
    })
  );
  return (Items ?? []) as InvitationItem[];
}
