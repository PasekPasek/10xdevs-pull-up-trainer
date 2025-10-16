import { z } from "zod";

export const loginRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(true),
});

export const registerRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  rememberMe: z.boolean().default(true),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
