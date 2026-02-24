import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, getUserId, errorToResponse } from "../../shared/api";
import { validateBody } from "../../shared/validation";
import * as gameService from "../services/game.service";
import { createGameSchema } from "../validators";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const userId = getUserId(event);
    const body = validateBody(event.body, createGameSchema);
    const item = await gameService.create(userId, body);
    return jsonResponse(201, item);
  } catch (e) {
    return errorToResponse(e);
  }
}
