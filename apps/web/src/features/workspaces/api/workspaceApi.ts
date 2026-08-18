import { api } from "@/services/api";
import type { SuccessResponse } from "@/features/auth/types";

export type PaginationMeta = {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
};

export type Workspace = {
    id: string;
    name: string;
    slug: string;
    ownerUserId: string;
    role: "owner" | "admin" | "member" | "viewer";
    membersCount: number;
    createdAt: string;
    updatedAt: string;
};

export type Site = {
    id: string;
    workspaceId: string;
    name: string;
    url: string;
    normalizedUrl: string;
    isActive: boolean;
    lastScannedAt: string | null;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

type Paginated<T> = SuccessResponse<{ items: T[]; pagination: PaginationMeta }>;

export const workspaceApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getWorkspaces: builder.query<Paginated<Workspace>, { search?: string } | void>({
            query: (params) => ({
                url: "/api/workspaces",
                params: params ?? undefined,
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.items.map((workspace) => ({
                              type: "Workspace" as const,
                              id: workspace.id,
                          })),
                          "Workspaces",
                      ]
                    : ["Workspaces"],
        }),
        getWorkspace: builder.query<SuccessResponse<{ workspace: Workspace }>, string>({
            query: (id) => `/api/workspaces/${id}`,
            providesTags: (_result, _error, id) => [{ type: "Workspace", id }],
        }),
        createWorkspace: builder.mutation<SuccessResponse<{ workspace: Workspace }>, { name: string }>({
            query: (body) => ({ url: "/api/workspaces", method: "POST", body }),
            invalidatesTags: ["Workspaces"],
        }),
        updateWorkspace: builder.mutation<
            SuccessResponse<{ workspace: Workspace }>,
            { id: string; name: string }
        >({
            query: ({ id, name }) => ({
                url: `/api/workspaces/${id}`,
                method: "PATCH",
                body: { name },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Workspace", id: arg.id },
                "Workspaces",
            ],
        }),
        getSites: builder.query<
            Paginated<Site>,
            {
                workspaceId: string;
                page?: number;
                perPage?: number;
                search?: string;
                status?: string;
            }
        >({
            query: ({ workspaceId, ...params }) => ({
                url: `/api/workspaces/${workspaceId}/sites`,
                params,
            }),
            providesTags: (result, _error, arg) =>
                result
                    ? [
                          ...result.data.items.map((site) => ({ type: "Site" as const, id: site.id })),
                          { type: "Sites", id: arg.workspaceId },
                      ]
                    : [{ type: "Sites", id: arg.workspaceId }],
        }),
        getSite: builder.query<
            SuccessResponse<{ site: Site }>,
            { workspaceId: string; siteId: string }
        >({
            query: ({ workspaceId, siteId }) =>
                `/api/workspaces/${workspaceId}/sites/${siteId}`,
            providesTags: (_result, _error, arg) => [{ type: "Site", id: arg.siteId }],
        }),
        createSite: builder.mutation<
            SuccessResponse<{ site: Site }>,
            { workspaceId: string; name: string; url: string }
        >({
            query: ({ workspaceId, ...body }) => ({
                url: `/api/workspaces/${workspaceId}/sites`,
                method: "POST",
                body,
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Sites", id: arg.workspaceId },
                "Workspaces",
            ],
        }),
        updateSite: builder.mutation<
            SuccessResponse<{ site: Site }>,
            { workspaceId: string; siteId: string; name?: string; url?: string; isActive?: boolean }
        >({
            query: ({ workspaceId, siteId, ...body }) => ({
                url: `/api/workspaces/${workspaceId}/sites/${siteId}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Site", id: arg.siteId },
                { type: "Sites", id: arg.workspaceId },
            ],
        }),
        deleteSite: builder.mutation<
            SuccessResponse<{ site: Site }>,
            { workspaceId: string; siteId: string }
        >({
            query: ({ workspaceId, siteId }) => ({
                url: `/api/workspaces/${workspaceId}/sites/${siteId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Site", id: arg.siteId },
                { type: "Sites", id: arg.workspaceId },
            ],
        }),
        restoreSite: builder.mutation<
            SuccessResponse<{ site: Site }>,
            { workspaceId: string; siteId: string }
        >({
            query: ({ workspaceId, siteId }) => ({
                url: `/api/workspaces/${workspaceId}/sites/${siteId}/restore`,
                method: "POST",
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Site", id: arg.siteId },
                { type: "Sites", id: arg.workspaceId },
            ],
        }),
    }),
});

export const {
    useGetWorkspacesQuery,
    useGetWorkspaceQuery,
    useCreateWorkspaceMutation,
    useUpdateWorkspaceMutation,
    useGetSitesQuery,
    useGetSiteQuery,
    useCreateSiteMutation,
    useUpdateSiteMutation,
    useDeleteSiteMutation,
    useRestoreSiteMutation,
} = workspaceApi;
