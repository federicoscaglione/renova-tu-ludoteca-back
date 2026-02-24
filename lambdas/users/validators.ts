import { z } from "zod";

export const registerSchema = z.object({
  invitationCode: z.string().min(1, "invitationCode is required"),
  firstName: z.string().min(1, "firstName is required"),
  lastName: z.string().min(1, "lastName is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "phone is required"),
  dni: z.string().min(1, "dni is required"),
  address: z.string().min(1, "address is required"),
  city: z.string().min(1, "city is required"),
  province: z.string().min(1, "province is required"),
  postalCode: z.string().optional(),
  password: z.string().min(8, "password must be at least 8 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const createInvitationSchema = z.object({
  email: z.string().email("Invalid email"),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
