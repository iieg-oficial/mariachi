import { LitElement, html } from 'lit';
import { themeCss } from './theme.js';
import { formCss } from './form-styles.js';
import { ICONS } from './icons.js';
import { renderField, renderError } from './fields.js';
import { spinner, renderMensaje, renderEmail, renderCaptura, renderAcciones, MAX_CAPTURA_MB } from './form-sections.js';
import { fetchTipos, postReporte, captureAuto, DEFAULT_ENDPOINT } from './api.js';

const ESPERA_LIMITE_MS = 10 * 60 * 1000;
const OBLIGATORIO = 'Este campo es obligatorio';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ColibriFormCore extends LitElement {
    static properties = {
        endpoint: { type: String },
        endpointTipos: { type: String, attribute: 'endpoint-tipos' },
        apiKey: { type: String, attribute: 'api-key' },
        sourceApp: { type: String, attribute: 'source-app' },
        tipos: { type: Array, attribute: false },
        tipoSlug: { type: String, attribute: 'tipo-default' },
        tiposFilter: { type: String, attribute: 'tipos' },
        tipoSelector: { type: String, attribute: 'tipo-selector' },
        emailRequired: { type: Boolean, attribute: 'email-required' },
        privacyUrl: { type: String, attribute: 'privacy-url' },
        cancelable: { type: Boolean },
        loading: { type: Boolean, attribute: false },
        loadFailed: { type: Boolean, attribute: false },
        submitting: { type: Boolean, attribute: false },
        success: { type: Boolean, attribute: false },
        error: { type: String, attribute: false },
        rateLimited: { type: Boolean, attribute: false },
        fieldErrors: { type: Object, attribute: false },
        tipOpen: { type: Boolean, attribute: false },
        values: { type: Object, attribute: false },
        screenshot: { type: Object, attribute: false },
        successId: { type: Number, attribute: false },
    };

    static styles = [themeCss, formCss];

    constructor() {
        super();
        this.tipos = [];
        this.tipoSlug = null;
        this.tiposFilter = '';
        this.tipoSelector = 'tabs';
        this.emailRequired = false;
        this.cancelable = false;
        this.loading = true;
        this.loadFailed = false;
        this.submitting = false;
        this.success = false;
        this.error = null;
        this.rateLimited = false;
        this.fieldErrors = {};
        this.tipOpen = false;
        this.values = {};
        this.screenshot = null;
        this.successId = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this._loadTipos();
    }

    disconnectedCallback() {
        clearTimeout(this._limitTimer);
        super.disconnectedCallback();
    }

    async _loadTipos() {
        this.loading = true;
        this.loadFailed = false;
        try {
            const url = this.endpointTipos || (this.endpoint || '').replace(/\/?$/, '') || DEFAULT_ENDPOINT;
            const data = await fetchTipos(url);
            const filter = (this.tiposFilter || '').split(',').map((s) => s.trim()).filter(Boolean);
            this.tipos = filter.length > 0 ? data.filter((t) => filter.includes(t.slug)) : data;
            if (!this.tipoSlug && this.tipos.length > 0) this.tipoSlug = this.tipos[0].slug;
            this.dispatchEvent(new CustomEvent('colibri:ready', { bubbles: true, composed: true }));
        } catch {
            this.loadFailed = true;
        } finally {
            this.loading = false;
        }
    }

    _emit(name, detail) {
        this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    _currentTipo() {
        return this.tipos.find((t) => t.slug === this.tipoSlug) || null;
    }

    _setTipo(slug) {
        if (this.tipoSlug === slug) return;
        this.tipoSlug = slug;
        this.values = { __mensaje: this.values.__mensaje, __email: this.values.__email };
        this.fieldErrors = {};
        this._emit('colibri:tipo-changed', { tipo: slug });
    }

    _setValue(key, value) {
        this.values = { ...this.values, [key]: value };
        if (this.fieldErrors[key]) this.fieldErrors = { ...this.fieldErrors, [key]: null };
    }

    _validate(tipo) {
        const errores = {};
        if (!(this.values.__mensaje || '').trim()) errores.__mensaje = OBLIGATORIO;
        const email = (this.values.__email || '').trim();
        if (this.emailRequired && !email) errores.__email = OBLIGATORIO;
        else if (email && !EMAIL_RE.test(email)) errores.__email = 'Correo no válido';
        for (const campo of (tipo?.formSchema?.campos || [])) {
            const v = this.values[campo.key];
            if (campo.required && (v === undefined || v === '' || (Array.isArray(v) && !v.length))) {
                errores[campo.key] = OBLIGATORIO;
            }
        }
        if (this.privacyUrl && !this.values.__consent) errores.__consent = OBLIGATORIO;
        this.fieldErrors = errores;
        return Object.keys(errores).length === 0;
    }

    async _handleSubmit(e) {
        e?.preventDefault?.();
        if (this.submitting || this.rateLimited) return;
        const tipo = this._currentTipo();
        if (!tipo || !this._validate(tipo)) return;

        const respuestas = {};
        for (const campo of (tipo.formSchema?.campos || [])) {
            if (this.values[campo.key] !== undefined) respuestas[campo.key] = this.values[campo.key];
        }
        const sourceContext = { auto: captureAuto() };
        const userIdentify = window?.colibri?.__userIdentify;
        if (userIdentify) sourceContext.user = userIdentify;
        const customCtx = window?.colibri?.__customContext;
        if (customCtx && Object.keys(customCtx).length > 0) sourceContext.custom = { ...customCtx };

        this.submitting = true;
        this.error = null;
        try {
            const result = await postReporte({
                endpoint: this.endpoint || DEFAULT_ENDPOINT,
                apiKey: this.apiKey,
                screenshot: this.screenshot,
                payload: {
                    tipo: tipo.slug,
                    mensaje: this.values.__mensaje.trim(),
                    email_contacto: (this.values.__email || '').trim() || null,
                    source_app: this.sourceApp,
                    source_route: location.pathname + location.search,
                    source_context: sourceContext,
                    respuestas: Object.keys(respuestas).length ? respuestas : null,
                },
            });
            this.success = true;
            this.successId = result.id;
            this.values = {};
            this.screenshot = null;
            this._emit('colibri:submitted', { id: result.id, tipo: tipo.slug });
        } catch (err) {
            if (err?.status === 429) {
                this.rateLimited = true;
                this._limitTimer = setTimeout(() => { this.rateLimited = false; }, ESPERA_LIMITE_MS);
            } else {
                this.error = err?.message || 'Error al enviar el reporte';
            }
            this._emit('colibri:error', { message: err?.message, status: err?.status });
        } finally {
            this.submitting = false;
        }
    }

    _handleScreenshot(e) {
        const file = e.target.files?.[0];
        if (file && file.size > MAX_CAPTURA_MB * 1024 * 1024) {
            this.fieldErrors = { ...this.fieldErrors, __captura: `El archivo supera ${MAX_CAPTURA_MB} MB` };
            e.target.value = '';
            return;
        }
        this.fieldErrors = { ...this.fieldErrors, __captura: null };
        this.screenshot = file || null;
    }

    _cancel() {
        this._emit('colibri:cancel');
    }

    _renderState(icon, title, msg, actions) {
        return html`
            <div class="state" role=${icon === ICONS.sectionError ? 'alert' : 'status'}>
                ${icon === ICONS.success ? html`<div class="state-badge">${icon}</div>` : icon}
                <h2 class="state-title">${title}</h2>
                <p class="state-msg">${msg}</p>
                <div class="actions" style="margin-top: 0;">${actions}</div>
            </div>
        `;
    }

    _renderTipoSelector(tipo) {
        const oculto = (this.tiposFilter && this.tipos.length === 1) || this.tipoSelector === 'hidden';
        if (oculto) return tipo?.descripcion ? html`<span class="description">${tipo.descripcion}</span>` : null;
        return html`
            <div class="field" role="group" aria-labelledby="tipo_label">
                <span class="field-label" id="tipo_label">¿Qué quieres reportar?</span>
                <div class="tipo-selector">
                    ${this.tipos.map((t) => html`
                        <button type="button" class="tipo-chip"
                            aria-pressed=${this.tipoSlug === t.slug ? 'true' : 'false'}
                            @click=${() => this._setTipo(t.slug)}>${t.label}</button>
                    `)}
                </div>
                ${tipo?.descripcion ? html`<span class="description">${tipo.descripcion}</span>` : ''}
            </div>
        `;
    }

    render() {
        if (this.loading) return html`<div class="loading" role="status">${spinner}Cargando formulario…</div>`;
        const cerrar = this.cancelable
            ? html`<button type="button" class="btn btn-secondary" @click=${this._cancel}>Cerrar</button>` : '';
        if (this.loadFailed) {
            return this._renderState(ICONS.sectionError, 'No se pudo cargar el formulario',
                'Por favor intenta nuevamente.',
                html`${cerrar}<button type="button" class="btn btn-primary" @click=${this._loadTipos}>Reintentar</button>`);
        }
        if (this.success) {
            return this._renderState(ICONS.success, 'Recibimos tu reporte',
                `${this.successId ? `Folio #${this.successId}. ` : ''}Si dejaste correo, te escribiremos ahí.`,
                html`<button type="button" class="btn btn-secondary" @click=${() => { this.success = false; }}>Enviar otro</button>
                    ${this.cancelable ? html`<button type="button" class="btn btn-primary" @click=${this._cancel}>Cerrar</button>` : ''}`);
        }
        if (this.error) {
            return this._renderState(ICONS.sectionError, 'No se pudo enviar tu reporte',
                'Por favor intenta nuevamente. Lo que escribiste se conserva.',
                html`${cerrar}<button type="button" class="btn btn-primary" @click=${this._handleSubmit}>Reintentar</button>`);
        }
        const tipo = this._currentTipo();
        return html`
            <form novalidate @submit=${this._handleSubmit}>
                ${this._renderTipoSelector(tipo)}
                ${renderMensaje(this)}
                ${renderEmail(this)}
                ${(tipo?.formSchema?.campos || []).map((c) => renderField(c, this.values[c.key], this.fieldErrors[c.key], (v) => this._setValue(c.key, v)))}
                ${renderCaptura(this)}
                ${this.privacyUrl ? html`<div class="consent">
                    <input type="checkbox" id="f_consent" aria-invalid=${this.fieldErrors.__consent ? 'true' : 'false'}
                        .checked=${Boolean(this.values.__consent)} @change=${(e) => this._setValue('__consent', e.target.checked)} />
                    <label for="f_consent">Acepto el <a href=${this.privacyUrl} target="_blank" rel="noopener noreferrer">aviso de privacidad</a> y que me escriban para dar seguimiento</label>
                </div>${renderError('f_consent', this.fieldErrors.__consent)}` : ''}
                ${renderAcciones(this)}
            </form>
        `;
    }
}
