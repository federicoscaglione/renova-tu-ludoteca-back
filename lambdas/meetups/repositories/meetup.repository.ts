import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { MeetupItem } from "../../shared/schema";

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);

export function getTableName(): string {
  const name = process.env.MEETUPS_TABLE;
  if (!name) throw new Error("MEETUPS_TABLE not set");
  return name;
}

export async function listAll(): Promise<MeetupItem[]> {
  const { Items } = await doc.send(
    new ScanCommand({ TableName: getTableName() })
  );
  return (Items ?? []) as MeetupItem[];
}

export async function findById(sessionId: string): Promise<MeetupItem | null> {
  const { Item } = await doc.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { sessionId },
    })
  );
  return (Item as MeetupItem) ?? null;
}

export async function create(item: MeetupItem): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: getTableName(),
      Item: item,
    })
  );
}

export async function update(
  sessionId: string,
  updates: Partial<Omit<MeetupItem, "sessionId" | "organizerId" | "createdAt">>
): Promise<MeetupItem> {
  const updateExp: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const allowed = ["title", "game", "location", "dateTime", "maxPlayers", "description"] as const;
  for (const k of allowed) {
    if (updates[k] !== undefined) {
      names[`#${k}`] = k;
      values[`:${k}`] = updates[k];
      updateExp.push(`#${k} = :${k}`);
    }
  }
  if (updateExp.length === 0) {
    const existing = await findById(sessionId);
    if (!existing) throw new Error("Meetup not found");
    return existing;
  }
  const { Attributes } = await doc.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: { sessionId },
      UpdateExpression: "SET " + updateExp.join(", "),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );
  return Attributes as MeetupItem;
}

export async function remove(sessionId: string): Promise<void> {
  await doc.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: { sessionId },
    })
  );
}
