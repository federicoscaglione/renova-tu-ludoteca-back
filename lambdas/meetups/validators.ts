import { z } from "zod";

export const createMeetupSchema = z.object({
  title: z.string().min(1, "title is required"),
  game: z.array(z.string()).optional().default([]),
  location: z.string().optional().default(""),
  dateTime: z.string().optional().default(""),
  maxPlayers: z.number({ invalid_type_error: "maxPlayers must be a number" }).min(1),
  description: z.string().optional().default(""),
});

export const updateMeetupSchema = z.object({
  title: z.string().min(1).optional(),
  game: z.array(z.string()).optional(),
  location: z.string().optional(),
  dateTime: z.string().optional(),
  maxPlayers: z.number().min(1).optional(),
  description: z.string().optional(),
});

export type CreateMeetupInput = z.infer<typeof createMeetupSchema>;
export type UpdateMeetupInput = z.infer<typeof updateMeetupSchema>;
