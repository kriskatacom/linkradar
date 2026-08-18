import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

export type ApiFieldErrors = Record<string, string[]>;

export type ApiErrorShape = {
    code: string;
    message: string;
    fields?: ApiFieldErrors;
};

type ApiErrorResponse = {
    success: false;
    error: ApiErrorShape;
};

export function getApiError(error: unknown): ApiErrorShape {
    const defaultError: ApiErrorShape = {
        code: "UNKNOWN_ERROR",
        message: "Something went wrong. Please try again.",
    };

    if (!error) {
        return defaultError;
    }

    const baseQueryError = error as FetchBaseQueryError & { data?: unknown };
    const responseData = baseQueryError.data as ApiErrorResponse | undefined;

    if (responseData?.error?.code && responseData?.error?.message) {
        return responseData.error;
    }

    const serialized = error as SerializedError;
    if (serialized.message) {
        return {
            code: "REQUEST_FAILED",
            message: serialized.message,
        };
    }

    return defaultError;
}
