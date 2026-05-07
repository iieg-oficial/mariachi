export class ColibriError extends Error {
    public readonly status?: number;
    public readonly detail?: unknown;

    constructor(message: string, status?: number, detail?: unknown) {
        super(message);
        this.name = "ColibriError";
        this.status = status;
        this.detail = detail;
    }
}

export class AuthError extends ColibriError {
    constructor(message: string, detail?: unknown) {
        super(message, 401, detail);
        this.name = "AuthError";
    }
}

export class ValidationError extends ColibriError {
    constructor(message: string, detail?: unknown) {
        super(message, 422, detail);
        this.name = "ValidationError";
    }
}

export class RateLimitError extends ColibriError {
    public readonly retryAfter?: number;

    constructor(message: string, retryAfter?: number, detail?: unknown) {
        super(message, 429, detail);
        this.name = "RateLimitError";
        this.retryAfter = retryAfter;
    }
}

export class ForbiddenError extends ColibriError {
    constructor(message: string, detail?: unknown) {
        super(message, 403, detail);
        this.name = "ForbiddenError";
    }
}

export class NetworkError extends ColibriError {
    constructor(message: string, cause?: unknown) {
        super(message);
        this.name = "NetworkError";
        if (cause !== undefined) {
            (this as unknown as { cause: unknown }).cause = cause;
        }
    }
}
