import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { UserItem } from "../../shared/schema";

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);

export function getTableName(): string {
  const name = process.env.USERS_TABLE;
  if (!name) throw new Error("USERS_TABLE not set");
  return name;
}

export async function getByUserId(userId: string): Promise<UserItem | null> {
  const pk = `USER#${userId}`;
  const sk = `USER#${userId}`;
  const { Item } = await doc.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { pk, sk },
    })
  );
  return (Item as UserItem) ?? null;
}

export async function getByDni(dni: string): Promise<UserItem | null> {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: "byDni",
      KeyConditionExpression: "dni = :dni",
      ExpressionAttributeValues: { ":dni": dni },
    })
  );
  const item = Items?.[0];
  return (item as UserItem) ?? null;
}

export async function create(item: UserItem): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: getTableName(),
      Item: item,
    })
  );
}
