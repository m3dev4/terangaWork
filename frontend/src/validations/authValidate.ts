import { z } from "zod";

export const RegisterValidation = z
  .object({
    email: z.string().email("Veuillez entrer une adresse email valide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const LoginValidation = z.object({
  email: z.string().email("Veuillez entrer une adresse email valide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export const VerifyCodeValidation = z.object({
  code: z
    .string()
    .length(6, "Le code doit contenir 6 chiffres")
    .regex(/^[0-9]+$/, "Le code doit contenir uniquement des chiffres"),
});

export const VerifyEmailValidation = z.object({
  email: z.string().email("Veuillez entrer une adresse email valide"),
  code: z
    .string()
    .length(6, "Le code doit contenir 6 chiffres")
    .regex(/^[0-9]+$/, "Le code doit contenir uniquement des chiffres"),
});

export type RegisterInput = z.infer<typeof RegisterValidation>;
export type LoginInput = z.infer<typeof LoginValidation>;
export type VerifyCodeInput = z.infer<typeof VerifyCodeValidation>;
