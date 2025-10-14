import { z } from "zod";

export const registerFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  rememberMe: z.boolean().default(true),
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function calculatePasswordStrength(password: string): {
  strength: "weak" | "medium" | "strong";
  percentage: number;
} {
  let score = 0;

  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 25;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;

  if (score <= 40) return { strength: "weak", percentage: 33 };
  if (score <= 70) return { strength: "medium", percentage: 66 };
  return { strength: "strong", percentage: 100 };
}
