import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { SessionParticipantItem } from "../../shared/schema";

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);

export function getTableName(): string {
  const name = process.env.PARTICIPANTS_TABLE;
  if (!name) throw new Error("PARTICIPANTS_TABLE not set");
  return name;
}

export async function listBySession(
  sessionId: string
): Promise<SessionParticipantItem[]> {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: getTableName(),
      KeyConditionExpression: "sessionId = :sid",
      ExpressionAttributeValues: { ":sid": sessionId },
    })
  );
  return (Items ?? []) as SessionParticipantItem[];
}

export async function findBySessionAndUser(
  sessionId: string,
  userId: string
): Promise<SessionParticipantItem | null> {
  const { Item } = await doc.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { sessionId, userId },
    })
  );
  return (Item as SessionParticipantItem) ?? null;
}

export async function create(item: SessionParticipantItem): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: getTableName(),
      Item: item,
    })
  );
}

export async function remove(sessionId: string, userId: string): Promise<void> {
  await doc.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: { sessionId, userId },
    })
  );
}
