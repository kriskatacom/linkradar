import argon2 from "argon2";

const isTest = process.env.NODE_ENV === "test";

export async function hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: isTest ? 4096 : 19456,
        timeCost: isTest ? 1 : 2,
    });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
        return await argon2.verify(hash, password);
    } catch {
        return false;
    }
}
