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
import type { OfferItem } from "../../shared/schema";

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);

export function getTableName(): string {
  const name = process.env.OFFERS_TABLE;
  if (!name) throw new Error("OFFERS_TABLE not set");
  return name;
}

export async function listByGame(gameId: string): Promise<OfferItem[]> {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: "byGame",
      KeyConditionExpression: "gameId = :gid",
      ExpressionAttributeValues: { ":gid": gameId },
    })
  );
  return (Items ?? []) as OfferItem[];
}

export async function listByUser(userId: string): Promise<OfferItem[]> {
  const { Items } = await doc.send(
    new ScanCommand({
      TableName: getTableName(),
      FilterExpression: "buyerId = :uid OR sellerId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    })
  );
  return (Items ?? []) as OfferItem[];
}

export async function findById(offerId: string): Promise<OfferItem | null> {
  const { Item } = await doc.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { offerId },
    })
  );
  return (Item as OfferItem) ?? null;
}

export async function create(item: OfferItem): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: getTableName(),
      Item: item,
    })
  );
}

export async function update(
  offerId: string,
  updates: Partial<Pick<OfferItem, "status" | "price" | "message">>
): Promise<OfferItem> {
  const updateExp: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  if (updates.status !== undefined) {
    names["#status"] = "status";
    values[":status"] = updates.status;
    updateExp.push("#status = :status");
  }
  if (updates.price !== undefined) {
    names["#price"] = "price";
    values[":price"] = updates.price;
    updateExp.push("#price = :price");
  }
  if (updates.message !== undefined) {
    names["#message"] = "message";
    values[":message"] = updates.message;
    updateExp.push("#message = :message");
  }
  if (updateExp.length === 0) {
    const existing = await findById(offerId);
    if (!existing) throw new Error("Offer not found");
    return existing;
  }
  const { Attributes } = await doc.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: { offerId },
      UpdateExpression: "SET " + updateExp.join(", "),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );
  return Attributes as OfferItem;
}

export async function remove(offerId: string): Promise<void> {
  await doc.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: { offerId },
    })
  );
}
