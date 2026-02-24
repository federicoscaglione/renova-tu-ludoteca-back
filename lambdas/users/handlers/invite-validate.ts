import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, errorToResponse } from "../../shared/api";
import * as inviteService from "../services/invite.service";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const code =
      event.queryStringParameters?.code?.trim() ??
      event.queryStringParameters?.invitationCode?.trim() ??
      "";
    const result = await inviteService.validateCode(code);
    return jsonResponse(200, result);
  } catch (e) {
    return errorToResponse(e);
  }
}
