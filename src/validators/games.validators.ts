import { z } from "zod";

const conditionEnum = z.enum([
  "Nuevo",
  "Como nuevo",
  "Usado",
  "Coleccionista",
]);

export const createGameSchema = z.object({
  catalogGameId: z.string().uuid().optional(),
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional().default(""),
  condition: conditionEnum.optional().default("Usado"),
  price: z.number({ invalid_type_error: "El precio debe ser un número" }).min(0, "El precio debe ser mayor o igual a 0"),
  location: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  isPublished: z.boolean().optional().default(false),
});

export const updateGameSchema = z.object({
  catalogGameId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  condition: conditionEnum.optional(),
  price: z.number().min(0).optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;
