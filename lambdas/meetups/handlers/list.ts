import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, errorToResponse } from "../../shared/api";
import * as meetupService from "../services/meetup.service";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const meetups = await meetupService.list();
    return jsonResponse(200, { meetups });
  } catch (e) {
    return errorToResponse(e);
  }
}
