import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, getUserId, errorToResponse } from "../../shared/api";
import { validateBodyOptional, requirePathParam } from "../../shared/validation";
import * as offerService from "../services/offer.service";
import { updateOfferSchema } from "../validators";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const userId = getUserId(event);
    const id = requirePathParam(event, "id");
    const body = validateBodyOptional(event.body, updateOfferSchema);
    const item = await offerService.update(userId, id, body);
    return jsonResponse(200, item);
  } catch (e) {
    return errorToResponse(e);
  }
}
