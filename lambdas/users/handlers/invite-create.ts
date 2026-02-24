import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, getUserId, errorToResponse } from "../../shared/api";
import { validateBody } from "../../shared/validation";
import { UnauthorizedError } from "../../shared/errors";
import * as inviteService from "../services/invite.service";
import { createInvitationSchema } from "../validators";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const userId = getUserId(event);
    if (!userId) throw new UnauthorizedError();
    const body = validateBody(event.body, createInvitationSchema);
    const result = await inviteService.createInvitation(userId, body);
    return jsonResponse(201, result);
  } catch (e) {
    return errorToResponse(e);
  }
}
