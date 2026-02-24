import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, getUserId, errorToResponse } from "../../shared/api";
import { requirePathParam } from "../../shared/validation";
import * as offerService from "../services/offer.service";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const userId = getUserId(event);
    const id = requirePathParam(event, "id");
    await offerService.remove(userId, id);
    return jsonResponse(200, { ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
