import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import type { GameItem } from "../../shared/schema";

export async function syncToAlgolia(
  algoliaSecretArn: string | undefined,
  game: GameItem | null,
  action: "save" | "delete"
): Promise<void> {
  if (!algoliaSecretArn) return;
  try {
    const sm = new SecretsManagerClient({});
    const secret = await sm.send(
      new GetSecretValueCommand({ SecretId: algoliaSecretArn })
    );
    const creds = JSON.parse(secret.SecretString || "{}");
    const appId = creds.ALGOLIA_APP_ID;
    const apiKey = creds.ALGOLIA_API_KEY;
    if (!appId || !apiKey || appId === "placeholder") return;

    const indexName = "games";
    const url =
      action === "delete" && game
        ? `https://${appId}-dsn.algolia.net/1/indexes/${indexName}/${encodeURIComponent(game.gameId)}`
        : `https://${appId}-dsn.algolia.net/1/indexes/${indexName}`;
    const method = action === "delete" ? "DELETE" : "PUT";
    const body =
      action === "save" && game
        ? JSON.stringify({
          objectID: game.gameId,
          title: game.title,
          description: game.description,
          condition: game.condition,
          price: game.price,
          location: game.location,
          sellerId: game.sellerId,
          tags: game.tags,
          createdAt: game.createdAt,
        })
        : undefined;

    await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Algolia-Application-Id": appId,
        "X-Algolia-API-Key": apiKey,
      },
      body,
    });
  } catch {
    // best-effort
  }
}
