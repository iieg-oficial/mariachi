import {
    AuthError,
    ColibriError,
    ForbiddenError,
    NetworkError,
    RateLimitError,
    ValidationError,
} from "./errors.js";
import type {
    Breadcrumb,
    ColibriOptions,
    IdentifyUser,
    ReportPayload,
    ReportResponse,
    ReporteTipo,
    SourceContext,
} from "./types.js";

export * from "./errors.js";
export * from "./types.js";

const DEFAULT_BASE_URL = "/api/public";
const DEFAULT_TIMEOUT_MS = 10000;

const _tiposCache = new Map<string, { data: ReporteTipo[]; expiresAt: number }>();

export class Colibri {
    private readonly sourceApp: string;
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly fetchImpl: typeof fetch;
    private readonly timeoutMs: number;
    private user: IdentifyUser | null = null;
    private context: Record<string, unknown> = {};

    constructor(options: ColibriOptions) {
        if (!options.sourceApp) throw new Error("Colibri: sourceApp es requerido");
        if (!options.apiKey) throw new Error("Colibri: apiKey es requerido");
        this.sourceApp = options.sourceApp;
        this.apiKey = options.apiKey;
        this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
        this.fetchImpl = options.fetchImpl || (typeof fetch !== "undefined" ? fetch : undefined as unknown as typeof fetch);
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

        if (!this.fetchImpl) {
            throw new Error("Colibri: fetch global no disponible. Pasa fetchImpl en las opciones (Node < 18).");
        }

        const isAbsolute = /^https?:\/\//i.test(this.baseUrl);
        const hasBrowserOrigin =
            typeof location !== "undefined" && typeof location?.origin === "string";
        if (!isAbsolute && !hasBrowserOrigin) {
            throw new Error(
                "Colibri: baseUrl debe ser absoluto (ej. 'https://iieg.jalisco.gob.mx/api/public') " +
                "en entornos sin navegador (Node, workers). Solo se puede usar una ruta relativa en el browser.",
            );
        }
    }

    identify(user: IdentifyUser | null): void {
        this.user = user;
    }

    setContext(key: string, value: unknown): void {
        if (value === undefined || value === null) {
            delete this.context[key];
            return;
        }
        this.context[key] = value;
    }

    clearContext(): void {
        this.context = {};
    }

    async tipos(force = false): Promise<ReporteTipo[]> {
        const cacheKey = `${this.baseUrl}|${this.apiKey}`;
        const now = Date.now();
        const cached = _tiposCache.get(cacheKey);
        if (!force && cached && cached.expiresAt > now) return cached.data;

        const data = await this.request<ReporteTipo[]>("GET", "/reportes/tipos");
        _tiposCache.set(cacheKey, { data, expiresAt: now + 5 * 60 * 1000 });
        return data;
    }

    async report(payload: ReportPayload, breadcrumbs?: Breadcrumb[]): Promise<ReportResponse> {
        if (!payload.tipo) throw new ValidationError("payload.tipo es requerido");
        if (!payload.mensaje) throw new ValidationError("payload.mensaje es requerido");

        const sourceContext: SourceContext = {};
        if (this.user) sourceContext.user = this.user;
        if (breadcrumbs && breadcrumbs.length > 0) sourceContext.breadcrumbs = breadcrumbs;
        if (Object.keys(this.context).length > 0) sourceContext.custom = { ...this.context };
        if (payload.context && Object.keys(payload.context).length > 0) {
            sourceContext.custom = { ...(sourceContext.custom || {}), ...payload.context };
        }

        const formData = new FormData();
        formData.append("tipo", payload.tipo);
        formData.append("mensaje", payload.mensaje);
        formData.append("source_app", this.sourceApp);
        if (payload.email) formData.append("email_contacto", payload.email);
        if (payload.sourceRoute) formData.append("source_route", payload.sourceRoute);
        formData.append("source_context", JSON.stringify(sourceContext));
        if (payload.respuestas) formData.append("respuestas", JSON.stringify(payload.respuestas));

        return this.request<ReportResponse>("POST", "/reportes", formData);
    }

    private async request<T>(method: string, path: string, body?: BodyInit): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timeoutId = controller && this.timeoutMs > 0
            ? setTimeout(() => controller.abort(), this.timeoutMs)
            : null;

        let response: Response;
        try {
            response = await this.fetchImpl(url, {
                method,
                body,
                headers: { "X-Colibri-Key": this.apiKey },
                signal: controller?.signal,
            });
        } catch (err) {
            throw new NetworkError(
                err instanceof Error ? err.message : "Error de red",
                err,
            );
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }

        if (!response.ok) {
            const detail = await this.safeJson(response);
            throw this.mapError(response, detail);
        }

        return response.json() as Promise<T>;
    }

    private async safeJson(response: Response): Promise<unknown> {
        try { return await response.json(); }
        catch { return undefined; }
    }

    private mapError(response: Response, detail: unknown): ColibriError {
        const detailMsg = this.extractMessage(detail) || `HTTP ${response.status}`;
        switch (response.status) {
            case 401: return new AuthError(detailMsg, detail);
            case 403: return new ForbiddenError(detailMsg, detail);
            case 422: return new ValidationError(detailMsg, detail);
            case 429: {
                const retryAfter = parseInt(response.headers.get("Retry-After") || "0", 10);
                return new RateLimitError(detailMsg, retryAfter || undefined, detail);
            }
            default: return new ColibriError(detailMsg, response.status, detail);
        }
    }

    private extractMessage(detail: unknown): string | null {
        if (!detail) return null;
        if (typeof detail === "string") return detail;
        if (typeof detail === "object" && detail !== null) {
            const obj = detail as { detail?: unknown };
            if (typeof obj.detail === "string") return obj.detail;
            if (Array.isArray(obj.detail)) {
                return obj.detail
                    .map((d: unknown) => (typeof d === "object" && d !== null && "msg" in d ? (d as { msg: string }).msg : JSON.stringify(d)))
                    .join("; ");
            }
        }
        return null;
    }
}

export function createColibri(options: ColibriOptions): Colibri {
    return new Colibri(options);
}

export const VERSION = "1.0.0";
