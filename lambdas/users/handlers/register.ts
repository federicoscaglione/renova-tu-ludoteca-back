import type { ApiGatewayV2Event, ApiResponse } from "../../shared/api";
import { jsonResponse, errorToResponse } from "../../shared/api";
import { validateBody } from "../../shared/validation";
import * as registerService from "../services/register.service";
import { registerSchema } from "../validators";

export async function handler(event: ApiGatewayV2Event): Promise<ApiResponse> {
  try {
    const body = validateBody(event.body, registerSchema);
    const result = await registerService.register(body);
    return jsonResponse(201, result);
  } catch (e) {
    return errorToResponse(e);
  }
}
