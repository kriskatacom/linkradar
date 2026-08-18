import { z } from "zod";

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export const listUsersQuerySchema = paginationQuerySchema.extend({
    search: z.string().trim().optional(),
    status: z.enum(["active", "inactive", "deleted", "all"]).optional(),
    role: z.string().trim().optional(),
    sort: z.enum(["name", "email", "createdAt", "updatedAt"]).default("createdAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
});

export const updateUserBodySchema = z.object({
    name: z.string().trim().min(2).max(150).optional(),
    isActive: z.boolean().optional(),
});

export const syncUserRolesBodySchema = z.object({
    roles: z.array(z.string().trim().min(1)).min(1),
});

export const listRolesQuerySchema = paginationQuerySchema.extend({
    search: z.string().trim().optional(),
    sort: z.enum(["name", "label", "createdAt"]).default("name"),
    direction: z.enum(["asc", "desc"]).default("asc"),
});

export const createRoleBodySchema = z.object({
    name: z
        .string()
        .trim()
        .min(2)
        .max(50)
        .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, hyphens, or underscores."),
    label: z.string().trim().min(2).max(100),
});

export const updateRoleBodySchema = z.object({
    label: z.string().trim().min(2).max(100),
});

export const syncRolePermissionsBodySchema = z.object({
    permissions: z.array(z.string().trim().min(1)),
});

export const userIdParamsSchema = z.object({
    id: z.string().uuid(),
});

export const roleIdParamsSchema = z.object({
    id: z.string().uuid(),
});
