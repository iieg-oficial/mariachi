import { LitElement, html, css } from 'lit';
import { themeCss } from './theme.js';
import { ICONS } from './icons.js';
import { fetchTipos, postReporte, captureAuto } from './api.js';


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
        loading: { type: Boolean, attribute: false },
        submitting: { type: Boolean, attribute: false },
        success: { type: Boolean, attribute: false },
        error: { type: String, attribute: false },
        values: { type: Object, attribute: false },
        screenshot: { type: Object, attribute: false },
        successId: { type: Number, attribute: false },
    };

    static styles = [
        themeCss,
        css`
            :host { display: block; }

            .field { margin-bottom: 12px; }
            .field-label {
                display: block;
                font-size: 13px;
                font-weight: 500;
                margin-bottom: 4px;
            }
            .field-help {
                display: block;
                font-size: 11px;
                color: var(--colibri-muted);
                margin-top: 2px;
            }
            .required-mark { color: var(--colibri-danger); margin-left: 2px; }

            input[type='text'], input[type='email'], input[type='url'],
            input[type='number'], textarea, select {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid var(--colibri-border);
                border-radius: var(--colibri-radius);
                background: var(--colibri-bg);
                color: var(--colibri-fg);
                font-size: 14px;
                font-family: inherit;
                outline: none;
                transition: border-color 0.15s;
            }
            input:focus, textarea:focus, select:focus { border-color: var(--colibri-primary); }
            textarea { min-height: 80px; resize: vertical; }

            .tipo-selector {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                margin-bottom: 16px;
            }
            .tipo-chip {
                padding: 6px 12px;
                border: 1px solid var(--colibri-border);
                border-radius: 20px;
                font-size: 12px;
                background: transparent;
                color: var(--colibri-fg);
                transition: all 0.15s;
            }
            .tipo-chip[aria-pressed='true'] {
                background: var(--colibri-primary);
                color: var(--colibri-primary-fg);
                border-color: var(--colibri-primary);
            }

            .actions { display: flex; gap: 8px; margin-top: 16px; align-items: center; }
            .submit {
                background: var(--colibri-primary);
                color: var(--colibri-primary-fg);
                border: none;
                border-radius: var(--colibri-radius);
                padding: 10px 16px;
                font-size: 14px;
                font-weight: 500;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .submit:disabled { opacity: 0.6; cursor: not-allowed; }
            .submit svg { width: 14px; height: 14px; }

            .screenshot-btn {
                background: transparent;
                border: 1px dashed var(--colibri-border);
                border-radius: var(--colibri-radius);
                padding: 8px 12px;
                color: var(--colibri-muted);
                font-size: 12px;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .screenshot-btn svg { width: 14px; height: 14px; }
            .screenshot-attached { color: var(--colibri-primary); }

            .success {
                text-align: center;
                padding: 24px 12px;
            }
            .success-icon {
                width: 48px;
                height: 48px;
                margin: 0 auto 12px;
                color: var(--colibri-primary);
            }
            .success-title { font-size: 16px; font-weight: 600; margin: 0 0 4px; }
            .success-msg { color: var(--colibri-muted); font-size: 13px; margin: 0; }

            .error-banner {
                background: #fee;
                color: var(--colibri-danger);
                padding: 8px 10px;
                border-radius: var(--colibri-radius);
                font-size: 12px;
                margin-bottom: 12px;
            }

            .loading { text-align: center; padding: 24px; color: var(--colibri-muted); font-size: 13px; }

            input[type='file'] { display: none; }

            .powered { font-size: 10px; color: var(--colibri-muted); text-align: right; margin-top: 8px; }
        `,
    ];

    constructor() {
        super();
        this.tipos = [];
        this.tipoSlug = null;
        this.tiposFilter = '';
        this.tipoSelector = 'tabs';
        this.emailRequired = false;
        this.loading = true;
        this.submitting = false;
        this.success = false;
        this.error = null;
        this.values = {};
        this.screenshot = null;
        this.successId = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this._loadTipos();
    }

    async _loadTipos() {
        this.loading = true;
        try {
            const url = this.endpointTipos || (this.endpoint || '').replace(/\/?$/, '') || '/api/public/reportes';
            const data = await fetchTipos(url);
            const filter = (this.tiposFilter || '').split(',').map((s) => s.trim()).filter(Boolean);
            this.tipos = filter.length > 0
                ? data.filter((t) => filter.includes(t.slug))
                : data;
            if (!this.tipoSlug && this.tipos.length > 0) {
                this.tipoSlug = this.tipos[0].slug;
            }
            this.dispatchEvent(new CustomEvent('colibri:ready', { bubbles: true, composed: true }));
        } catch (err) {
            this.error = err?.message || 'No se pudieron cargar los tipos';
        } finally {
            this.loading = false;
        }
    }

    _currentTipo() {
        return this.tipos.find((t) => t.slug === this.tipoSlug) || null;
    }

    _setTipo(slug) {
        if (this.tipoSlug === slug) return;
        this.tipoSlug = slug;
        this.values = {};
        this.dispatchEvent(new CustomEvent('colibri:tipo-changed', { detail: { tipo: slug }, bubbles: true, composed: true }));
    }

    _setValue(key, value) {
        this.values = { ...this.values, [key]: value };
    }

    _renderField(campo) {
        const value = this.values[campo.key] ?? '';
        const baseAttrs = {
            id: `f_${campo.key}`,
            placeholder: campo.placeholder || '',
            required: campo.required,
            'aria-required': campo.required,
        };
        let input;
        if (campo.type === 'textarea') {
            input = html`<textarea ...=${baseAttrs} maxlength=${campo.maxLength || ''}
                .value=${value} @input=${(e) => this._setValue(campo.key, e.target.value)}></textarea>`;
        } else if (campo.type === 'select') {
            input = html`<select id=${baseAttrs.id} ?required=${campo.required}
                .value=${value} @change=${(e) => this._setValue(campo.key, e.target.value)}>
                <option value="">${campo.placeholder || 'Selecciona…'}</option>
                ${(campo.options || []).map((o) => html`<option value=${o.value} ?selected=${value === o.value}>${o.label}</option>`)}
            </select>`;
        } else if (campo.type === 'multiselect') {
            const arr = Array.isArray(value) ? value : [];
            input = html`<select id=${baseAttrs.id} multiple
                @change=${(e) => this._setValue(campo.key, [...e.target.selectedOptions].map((o) => o.value))}>
                ${(campo.options || []).map((o) => html`<option value=${o.value} ?selected=${arr.includes(o.value)}>${o.label}</option>`)}
            </select>`;
        } else if (campo.type === 'checkbox') {
            input = html`<label style="display:flex; align-items:center; gap:6px;">
                <input type="checkbox" ?checked=${Boolean(value)}
                    @change=${(e) => this._setValue(campo.key, e.target.checked)} />
                ${campo.placeholder || 'Sí'}
            </label>`;
        } else if (campo.type === 'number') {
            input = html`<input type="number" id=${baseAttrs.id} placeholder=${baseAttrs.placeholder} ?required=${campo.required}
                .value=${value} @input=${(e) => this._setValue(campo.key, e.target.value)} />`;
        } else if (campo.type === 'email') {
            input = html`<input type="email" id=${baseAttrs.id} placeholder=${baseAttrs.placeholder} ?required=${campo.required}
                .value=${value} @input=${(e) => this._setValue(campo.key, e.target.value)} />`;
        } else if (campo.type === 'url') {
            input = html`<input type="url" id=${baseAttrs.id} placeholder=${baseAttrs.placeholder} ?required=${campo.required}
                .value=${value} @input=${(e) => this._setValue(campo.key, e.target.value)} />`;
        } else {
            input = html`<input type="text" id=${baseAttrs.id} placeholder=${baseAttrs.placeholder} ?required=${campo.required}
                maxlength=${campo.maxLength || ''}
                .value=${value} @input=${(e) => this._setValue(campo.key, e.target.value)} />`;
        }
        return html`
            <div class="field">
                <label class="field-label" for=${baseAttrs.id}>
                    ${campo.label}${campo.required ? html`<span class="required-mark">*</span>` : ''}
                </label>
                ${input}
                ${campo.helpText ? html`<span class="field-help">${campo.helpText}</span>` : ''}
            </div>
        `;
    }

    async _handleSubmit(e) {
        e?.preventDefault?.();
        if (this.submitting) return;
        const tipo = this._currentTipo();
        if (!tipo) { this.error = 'Selecciona un tipo de reporte'; return; }

        const mensaje = this.values.__mensaje || '';
        if (!mensaje.trim()) { this.error = 'El mensaje es requerido'; return; }

        const email = this.values.__email || '';
        if (this.emailRequired && !email) { this.error = 'Email es requerido'; return; }

        const respuestas = {};
        for (const campo of (tipo.formSchema?.campos || [])) {
            if (campo.required && (this.values[campo.key] === undefined || this.values[campo.key] === '')) {
                this.error = `Campo requerido: ${campo.label}`;
                return;
            }
            if (this.values[campo.key] !== undefined) {
                respuestas[campo.key] = this.values[campo.key];
            }
        }

        this.submitting = true;
        this.error = null;
        try {
            const auto = captureAuto();
            const sourceContext = { auto };
            const userIdentify = window?.colibri?.__userIdentify;
            if (userIdentify) sourceContext.user = userIdentify;
            const customCtx = window?.colibri?.__customContext;
            if (customCtx && Object.keys(customCtx).length > 0) {
                sourceContext.custom = { ...customCtx };
            }

            const result = await postReporte({
                endpoint: this.endpoint || '/api/public/reportes',
                apiKey: this.apiKey,
                screenshot: this.screenshot,
                payload: {
                    tipo: tipo.slug,
                    mensaje,
                    email_contacto: email || null,
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
            this.dispatchEvent(new CustomEvent('colibri:submitted', {
                detail: { id: result.id, tipo: tipo.slug },
                bubbles: true,
                composed: true,
            }));
        } catch (err) {
            this.error = err?.message || 'Error al enviar el reporte';
            this.dispatchEvent(new CustomEvent('colibri:error', {
                detail: { message: this.error, status: err?.status },
                bubbles: true,
                composed: true,
            }));
        } finally {
            this.submitting = false;
        }
    }

    _handleScreenshot(e) {
        const file = e.target.files?.[0];
        if (file && file.size > 2 * 1024 * 1024) {
            this.error = 'La captura supera 2 MB';
            e.target.value = '';
            return;
        }
        this.screenshot = file || null;
    }

    _renderTipoSelector() {
        if (this.tiposFilter && this.tipos.length === 1) return null;
        if (this.tipoSelector === 'hidden') return null;
        return html`
            <div class="tipo-selector" role="tablist">
                ${this.tipos.map((t) => html`
                    <button type="button" class="tipo-chip"
                        aria-pressed=${this.tipoSlug === t.slug}
                        @click=${() => this._setTipo(t.slug)}>
                        ${t.label}
                    </button>
                `)}
            </div>
        `;
    }

    render() {
        if (this.loading) return html`<div class="loading">Cargando…</div>`;
        if (this.success) {
            return html`
                <div class="success">
                    <div class="success-icon">${ICONS.check}</div>
                    <p class="success-title">¡Gracias por tu reporte!</p>
                    <p class="success-msg">Recibimos tu mensaje. ID #${this.successId}</p>
                </div>
            `;
        }
        const tipo = this._currentTipo();
        const campos = tipo?.formSchema?.campos || [];
        return html`
            <form @submit=${this._handleSubmit}>
                ${this.error ? html`<div class="error-banner">${this.error}</div>` : ''}
                ${this._renderTipoSelector()}
                ${tipo?.descripcion ? html`<p class="field-help" style="margin: 0 0 10px;">${tipo.descripcion}</p>` : ''}

                <div class="field">
                    <label class="field-label" for="f_mensaje">
                        Mensaje<span class="required-mark">*</span>
                    </label>
                    <textarea id="f_mensaje" required maxlength="2000"
                        placeholder="Cuéntanos qué pasó…"
                        .value=${this.values.__mensaje || ''}
                        @input=${(e) => this._setValue('__mensaje', e.target.value)}></textarea>
                </div>

                <div class="field">
                    <label class="field-label" for="f_email">
                        Email${this.emailRequired ? html`<span class="required-mark">*</span>` : ''}
                    </label>
                    <input type="email" id="f_email" ?required=${this.emailRequired}
                        placeholder="opcional, para responderte"
                        .value=${this.values.__email || ''}
                        @input=${(e) => this._setValue('__email', e.target.value)} />
                </div>

                ${campos.map((c) => this._renderField(c))}

                <div class="actions">
                    <label class="screenshot-btn ${this.screenshot ? 'screenshot-attached' : ''}">
                        ${ICONS.camera}
                        ${this.screenshot ? this.screenshot.name : 'Adjuntar captura'}
                        <input type="file" accept="image/png,image/jpeg" @change=${this._handleScreenshot} />
                    </label>
                    <div style="flex: 1"></div>
                    <button type="submit" class="submit" ?disabled=${this.submitting}>
                        ${ICONS.send}
                        ${this.submitting ? 'Enviando…' : 'Enviar reporte'}
                    </button>
                </div>

                <div class="powered">Powered by Colibri · IIEG</div>
            </form>
        `;
    }
}
