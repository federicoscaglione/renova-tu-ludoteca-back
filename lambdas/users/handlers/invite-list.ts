import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, getUserId, errorToResponse } from "../../shared/api";
import { UnauthorizedError } from "../../shared/errors";
import * as inviteService from "../services/invite.service";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const userId = getUserId(event);
    if (!userId) throw new UnauthorizedError();
    const list = await inviteService.listInvitations(userId);
    return jsonResponse(200, { invitations: list });
  } catch (e) {
    return errorToResponse(e);
  }
}
