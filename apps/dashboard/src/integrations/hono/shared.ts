import type { ZodType } from "zod";

import { apiErrorSchema } from "./models";

// Handlers throw this until the corresponding data access and orchestration
// logic lands. The app-level error handler turns it into the documented 501
// response.
export class NotImplementedError extends Error {
    constructor() {
        super(
            "This endpoint is part of the public API contract but is not implemented yet."
        );
        this.name = "NotImplementedError";
    }
}

export const notImplemented = (): never => {
    throw new NotImplementedError();
};

export const jsonResponse = <T extends ZodType>(
    schema: T,
    description: string
) => ({
    content: { "application/json": { schema } },
    description,
});

// Every domain route can reject invalid input or report an unimplemented
// handler.
export const errorResponses = {
    422: jsonResponse(apiErrorSchema, "Invalid request."),
    501: jsonResponse(apiErrorSchema, "Not implemented."),
} as const;

// Routes that address a specific resource can also report a missing one.
export const resourceErrorResponses = {
    ...errorResponses,
    404: jsonResponse(apiErrorSchema, "Resource not found."),
} as const;
