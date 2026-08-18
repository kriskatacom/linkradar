import { api } from "@/services/api";
import type { SuccessResponse } from "@/features/auth/types";

export type PaginationMeta = {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
};

export type AdminUser = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    isActive: boolean;
    deletedAt: string | null;
    roles: string[];
    createdAt: string;
    updatedAt: string;
};

export type AdminRole = {
    id: string;
    name: string;
    label: string;
    isSystem: boolean;
    permissionsCount?: number;
    usersCount?: number;
    permissions?: string[];
    createdAt: string;
    updatedAt: string;
};

export type AdminPermission = {
    id: string;
    name: string;
    label: string;
    description: string | null;
    usedByRoles: string[];
};

export type AdminStats = {
    users: number;
    roles: number;
    permissions: number;
    activeUsers: number;
};

type PaginatedUsers = SuccessResponse<{
    items: AdminUser[];
    pagination: PaginationMeta;
}>;

type PaginatedRoles = SuccessResponse<{
    items: AdminRole[];
    pagination: PaginationMeta;
}>;

export const adminApi = api.injectEndpoints({
    endpoints: (builder) => ({
        getAdminStats: builder.query<SuccessResponse<{ stats: AdminStats }>, void>({
            query: () => "/api/admin/stats",
            providesTags: ["AdminStats"],
        }),
        getAdminUsers: builder.query<
            PaginatedUsers,
            {
                page?: number;
                perPage?: number;
                search?: string;
                status?: string;
                role?: string;
            }
        >({
            query: (params) => ({
                url: "/api/admin/users",
                params,
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.items.map((user) => ({
                              type: "AdminUser" as const,
                              id: user.id,
                          })),
                          "AdminUsers",
                      ]
                    : ["AdminUsers"],
        }),
        getAdminUser: builder.query<SuccessResponse<{ user: AdminUser }>, string>({
            query: (id) => `/api/admin/users/${id}`,
            providesTags: (_result, _error, id) => [{ type: "AdminUser", id }],
        }),
        updateAdminUser: builder.mutation<
            SuccessResponse<{ user: AdminUser }>,
            { id: string; name?: string; isActive?: boolean }
        >({
            query: ({ id, ...body }) => ({
                url: `/api/admin/users/${id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "AdminUser", id: arg.id },
                "AdminUsers",
                "AdminStats",
            ],
        }),
        syncAdminUserRoles: builder.mutation<
            SuccessResponse<{ user: AdminUser }>,
            { id: string; roles: string[] }
        >({
            query: ({ id, roles }) => ({
                url: `/api/admin/users/${id}/roles`,
                method: "PUT",
                body: { roles },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "AdminUser", id: arg.id },
                "AdminUsers",
            ],
        }),
        deactivateAdminUser: builder.mutation<SuccessResponse<{ user: AdminUser }>, string>({
            query: (id) => ({
                url: `/api/admin/users/${id}/deactivate`,
                method: "POST",
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: "AdminUser", id },
                "AdminUsers",
                "AdminStats",
            ],
        }),
        activateAdminUser: builder.mutation<SuccessResponse<{ user: AdminUser }>, string>({
            query: (id) => ({
                url: `/api/admin/users/${id}/activate`,
                method: "POST",
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: "AdminUser", id },
                "AdminUsers",
                "AdminStats",
            ],
        }),
        deleteAdminUser: builder.mutation<SuccessResponse<{ user: AdminUser }>, string>({
            query: (id) => ({
                url: `/api/admin/users/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: "AdminUser", id },
                "AdminUsers",
                "AdminStats",
            ],
        }),
        restoreAdminUser: builder.mutation<SuccessResponse<{ user: AdminUser }>, string>({
            query: (id) => ({
                url: `/api/admin/users/${id}/restore`,
                method: "POST",
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: "AdminUser", id },
                "AdminUsers",
                "AdminStats",
            ],
        }),
        getAdminRoles: builder.query<
            PaginatedRoles,
            { page?: number; perPage?: number; search?: string }
        >({
            query: (params) => ({
                url: "/api/admin/roles",
                params,
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.data.items.map((role) => ({
                              type: "AdminRole" as const,
                              id: role.id,
                          })),
                          "AdminRoles",
                      ]
                    : ["AdminRoles"],
        }),
        getAdminRole: builder.query<SuccessResponse<{ role: AdminRole }>, string>({
            query: (id) => `/api/admin/roles/${id}`,
            providesTags: (_result, _error, id) => [{ type: "AdminRole", id }],
        }),
        createAdminRole: builder.mutation<
            SuccessResponse<{ role: AdminRole }>,
            { name: string; label: string }
        >({
            query: (body) => ({
                url: "/api/admin/roles",
                method: "POST",
                body,
            }),
            invalidatesTags: ["AdminRoles", "AdminStats"],
        }),
        updateAdminRole: builder.mutation<
            SuccessResponse<{ role: AdminRole }>,
            { id: string; label: string }
        >({
            query: ({ id, label }) => ({
                url: `/api/admin/roles/${id}`,
                method: "PATCH",
                body: { label },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "AdminRole", id: arg.id },
                "AdminRoles",
            ],
        }),
        deleteAdminRole: builder.mutation<SuccessResponse<{ deleted: true }>, string>({
            query: (id) => ({
                url: `/api/admin/roles/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["AdminRoles", "AdminStats", "AdminPermissions"],
        }),
        syncAdminRolePermissions: builder.mutation<
            SuccessResponse<{ role: AdminRole }>,
            { id: string; permissions: string[] }
        >({
            query: ({ id, permissions }) => ({
                url: `/api/admin/roles/${id}/permissions`,
                method: "PUT",
                body: { permissions },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "AdminRole", id: arg.id },
                "AdminRoles",
                "AdminPermissions",
            ],
        }),
        getAdminPermissions: builder.query<
            SuccessResponse<{ items: AdminPermission[] }>,
            void
        >({
            query: () => "/api/admin/permissions",
            providesTags: ["AdminPermissions"],
        }),
    }),
});

export const {
    useGetAdminStatsQuery,
    useGetAdminUsersQuery,
    useGetAdminUserQuery,
    useUpdateAdminUserMutation,
    useSyncAdminUserRolesMutation,
    useDeactivateAdminUserMutation,
    useActivateAdminUserMutation,
    useDeleteAdminUserMutation,
    useRestoreAdminUserMutation,
    useGetAdminRolesQuery,
    useGetAdminRoleQuery,
    useCreateAdminRoleMutation,
    useUpdateAdminRoleMutation,
    useDeleteAdminRoleMutation,
    useSyncAdminRolePermissionsMutation,
    useGetAdminPermissionsQuery,
} = adminApi;
