export type JsonRecord = Record<string, unknown>;

export function asString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function asBoolean(value: unknown): boolean {
    return value === true || value === "true";
}

export async function getJson(
    url: string,
    accessToken?: string,
    extraHeaders: Record<string, string> = {},
): Promise<JsonRecord> {
    const headers: Record<string, string> = {
        accept: "application/json",
        ...extraHeaders,
    };

    if (accessToken) {
        headers.authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error(`Social provider request failed: ${response.status}`);
    }

    return (await response.json()) as JsonRecord;
}
