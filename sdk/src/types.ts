export interface IdentifyUser {
    id?: number | string;
    email?: string;
    name?: string;
    role?: string;
    metadata?: Record<string, unknown>;
}

export interface Breadcrumb {
    timestamp?: string;
    category?: string;
    level?: "debug" | "info" | "warning" | "error" | "critical";
    message?: string;
    data?: Record<string, unknown>;
}

export interface AutoCaptured {
    url?: string;
    referrer?: string;
    userAgent?: string;
    lang?: string;
    timezone?: string;
    timestamp?: string;
    version?: string;
    viewport?: { width: number; height: number; dpr?: number };
}

export interface SourceContext {
    auto?: AutoCaptured;
    user?: IdentifyUser;
    breadcrumbs?: Breadcrumb[];
    custom?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface ReportPayload {
    tipo: string;
    mensaje: string;
    email?: string;
    sourceRoute?: string;
    context?: Record<string, unknown>;
    respuestas?: Record<string, unknown>;
}

export interface ReportResponse {
    id: number;
}

export interface FormFieldOption {
    value: string;
    label: string;
}

export interface FormFieldDef {
    key: string;
    label: string;
    type: "text" | "textarea" | "email" | "url" | "number" | "select" | "multiselect" | "radio" | "checkbox" | "file" | "direccion";
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    maxLength?: number;
    options?: FormFieldOption[];
}

export interface FormSchema {
    campos: FormFieldDef[];
}

export interface ReporteTipo {
    id: number;
    slug: string;
    label: string;
    color: string;
    icon: string | null;
    descripcion: string | null;
    formSchema: FormSchema | null;
    activo: boolean;
    orden: number;
}

export interface ColibriOptions {
    sourceApp: string;
    apiKey: string;
    baseUrl?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
}
