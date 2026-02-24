import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, getUserId, errorToResponse } from "../../shared/api";
import { optionalQueryParam } from "../../shared/validation";
import * as offerService from "../services/offer.service";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const userId = getUserId(event);
    const gameId = optionalQueryParam(event, "gameId");
    const offers = await offerService.list(userId, gameId);
    return jsonResponse(200, { offers });
  } catch (e) {
    return errorToResponse(e);
  }
}
