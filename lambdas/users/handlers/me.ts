import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, getUserId, errorToResponse } from "../../shared/api";
import { UnauthorizedError, NotFoundError } from "../../shared/errors";
import * as userRepository from "../repositories/user.repository";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const userId = getUserId(event);
    if (!userId) throw new UnauthorizedError();
    const user = await userRepository.getByUserId(userId);
    if (!user) throw new NotFoundError("User profile not found");
    const { pk, sk, ...profile } = user;
    return jsonResponse(200, profile);
  } catch (e) {
    return errorToResponse(e);
  }
}
