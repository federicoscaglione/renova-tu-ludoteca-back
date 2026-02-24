import { z } from "zod";

const conditionEnum = z.enum([
  "Nuevo",
  "Como nuevo",
  "Usado",
  "Coleccionista",
]);

export const createGameSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().optional().default(""),
  condition: conditionEnum.optional().default("Usado"),
  price: z.number({ invalid_type_error: "price must be a number" }).min(0),
  location: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
});

export const updateGameSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  condition: conditionEnum.optional(),
  price: z.number().min(0).optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;
