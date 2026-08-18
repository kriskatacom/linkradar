import { z } from "zod";

export const registerBodySchema = z.object({
    name: z
        .string({ required_error: "Name is required." })
        .trim()
        .min(2, "Name must contain at least 2 characters.")
        .max(150, "Name must contain at most 150 characters."),
    email: z
        .string({ required_error: "Email is required." })
        .trim()
        .toLowerCase()
        .max(255, "Email must contain at most 255 characters.")
        .email("Invalid email address."),
    password: z
        .string({ required_error: "Password is required." })
        .min(8, "Password must contain at least 8 characters.")
        .max(128, "Password must contain at most 128 characters."),
});

export const loginBodySchema = z.object({
    email: z
        .string({ required_error: "Email is required." })
        .trim()
        .toLowerCase()
        .max(255, "Email must contain at most 255 characters.")
        .email("Invalid email address."),
    password: z.string({ required_error: "Password is required." }).min(1, "Password is required."),
});

export const updateThemeBodySchema = z.object({
    theme: z.enum(["light", "dark", "system"], {
        required_error: "Theme is required.",
        invalid_type_error: "Theme must be light, dark, or system.",
    }),
});

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
export type UpdateThemeInput = z.infer<typeof updateThemeBodySchema>;
