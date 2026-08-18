import { z } from "zod";

export const listWorkspacesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
});

export const createWorkspaceBodySchema = z.object({
    name: z.string().trim().min(2).max(150),
});

export const updateWorkspaceBodySchema = z.object({
    name: z.string().trim().min(2).max(150),
});

export const workspaceIdParamsSchema = z.object({
    id: z.string().uuid(),
});

export const workspaceSiteParamsSchema = z.object({
    workspaceId: z.string().uuid(),
    siteId: z.string().uuid().optional(),
});

export const listSitesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    status: z.enum(["active", "inactive", "deleted", "all"]).optional(),
    sort: z.enum(["name", "url", "createdAt", "updatedAt"]).default("createdAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
});

export const createSiteBodySchema = z.object({
    name: z.string().trim().min(2).max(150),
    url: z.string().trim().min(1).max(2048),
});

export const updateSiteBodySchema = z.object({
    name: z.string().trim().min(2).max(150).optional(),
    url: z.string().trim().min(1).max(2048).optional(),
    isActive: z.boolean().optional(),
});
