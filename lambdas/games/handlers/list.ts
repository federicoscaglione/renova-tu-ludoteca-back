import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, errorToResponse } from "../../shared/api";
import { optionalQueryParam } from "../../shared/validation";
import * as gameService from "../services/game.service";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const sellerId = optionalQueryParam(event, "sellerId");
    const games = await gameService.list(sellerId);
    return jsonResponse(200, { games });
  } catch (e) {
    return errorToResponse(e);
  }
}
