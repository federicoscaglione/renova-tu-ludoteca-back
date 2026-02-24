import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, getUserId, errorToResponse } from "../../shared/api";
import { validateBodyOptional, requirePathParam } from "../../shared/validation";
import * as gameService from "../services/game.service";
import { updateGameSchema } from "../validators";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const userId = getUserId(event);
    const id = requirePathParam(event, "id");
    const body = validateBodyOptional(event.body, updateGameSchema);
    const item = await gameService.update(userId, id, body);
    return jsonResponse(200, item);
  } catch (e) {
    return errorToResponse(e);
  }
}
