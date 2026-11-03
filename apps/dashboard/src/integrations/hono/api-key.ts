import { createMiddleware } from "hono/factory";

const BEARER_TOKEN_PATTERN = /^Bearer\s+(?<token>.+)$/iu;

export interface ApiKeyPrincipal {
    id: string;
    name: string;
}

const DEVELOPMENT_PRINCIPAL: ApiKeyPrincipal = {
    id: "development",
    name: "Development bypass",
};

export interface PublicApiEnv {
    Variables: {
        apiKey: ApiKeyPrincipal;
        bearerToken: string | null;
    };
}

export const readBearerToken = (request: Request): string | null => {
    const authorization = request.headers.get("authorization");

    if (!authorization) {
        return null;
    }

    return BEARER_TOKEN_PATTERN.exec(authorization)?.groups?.token ?? null;
};

/**
 * Resolves the caller from an `Authorization: Bearer <token>` header.
 *
 * API key issuance and lookup are not implemented yet, so every request —
 * including one without a token — resolves to the development principal.
 * Return `null` for missing or unknown tokens once the key store exists; the
 * guard below already answers 401 for that case.
 */
function authenticateApiKey(_token: string | null): ApiKeyPrincipal | null {
    // TODO: Replace this permissive return with the API token checker.
    // Look up the bearer token (hashed, never raw), return the owning
    // principal for a match, and return `null` for missing or unknown tokens.
    return DEVELOPMENT_PRINCIPAL;
}

export const apiKeyGuard = createMiddleware<PublicApiEnv>(async (c, next) => {
    const bearerToken = readBearerToken(c.req.raw);
    const apiKey = authenticateApiKey(bearerToken);

    if (!apiKey) {
        return c.json(
            {
                code: "unauthorized",
                message: "A valid API key is required.",
            },
            401
        );
    }

    c.set("apiKey", apiKey);
    c.set("bearerToken", bearerToken);

    return next();
});
