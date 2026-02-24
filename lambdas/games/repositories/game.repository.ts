import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { GameItem } from "../../shared/schema";

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);

export function getTableName(): string {
  const name = process.env.GAMES_TABLE;
  if (!name) throw new Error("GAMES_TABLE not set");
  return name;
}

export async function listBySeller(sellerId: string): Promise<GameItem[]> {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: "bySeller",
      KeyConditionExpression: "sellerId = :sid",
      ExpressionAttributeValues: { ":sid": sellerId },
    })
  );
  return (Items ?? []) as GameItem[];
}

export async function listAll(): Promise<GameItem[]> {
  const { Items } = await doc.send(
    new ScanCommand({ TableName: getTableName() })
  );
  return (Items ?? []) as GameItem[];
}

export async function findById(gameId: string): Promise<GameItem | null> {
  const { Item } = await doc.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { gameId },
    })
  );
  return (Item as GameItem) ?? null;
}

export async function create(item: GameItem): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: getTableName(),
      Item: item,
    })
  );
}

export async function update(
  gameId: string,
  updates: Partial<Omit<GameItem, "gameId" | "sellerId" | "createdAt">>
): Promise<GameItem> {
  const updateExp: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const allowed = [
    "title",
    "description",
    "condition",
    "price",
    "location",
    "tags",
    "images",
  ] as const;
  for (const k of allowed) {
    if (updates[k] !== undefined) {
      names[`#${k}`] = k;
      values[`:${k}`] = updates[k];
      updateExp.push(`#${k} = :${k}`);
    }
  }
  if (updateExp.length === 0) {
    const existing = await findById(gameId);
    if (!existing) throw new Error("Game not found");
    return existing;
  }
  const { Attributes } = await doc.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: { gameId },
      UpdateExpression: "SET " + updateExp.join(", "),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );
  return Attributes as GameItem;
}

export async function remove(gameId: string): Promise<void> {
  await doc.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: { gameId },
    })
  );
}
