import { z } from "zod";

const offerStatusEnum = z.enum([
  "pending",
  "accepted",
  "rejected",
  "completed",
]);

export const createOfferSchema = z.object({
  gameId: z.string().min(1, "gameId is required"),
  price: z.number({ invalid_type_error: "price must be a number" }).min(0),
  message: z.string().optional().default(""),
});

export const updateOfferSchema = z.object({
  status: offerStatusEnum.optional(),
  price: z.number().min(0).optional(),
  message: z.string().optional(),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
