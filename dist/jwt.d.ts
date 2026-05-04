export declare function signToken(payload: {
    id: string;
    email: string;
    role: string;
}): string;
export declare function verifyToken(token: string): {
    id: string;
    email: string;
    role: string;
} | null;
