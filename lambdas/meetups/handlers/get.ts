import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, errorToResponse } from "../../shared/api";
import { requirePathParam } from "../../shared/validation";
import * as meetupService from "../services/meetup.service";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const id = requirePathParam(event, "id");
    const item = await meetupService.get(id);
    return jsonResponse(200, item);
  } catch (e) {
    return errorToResponse(e);
  }
}
