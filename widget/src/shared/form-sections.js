import { html } from 'lit';
import { ICONS } from './icons.js';
import { renderError } from './fields.js';

export const MAX_MENSAJE = 2000;
export const MAX_CAPTURA_MB = 2;

export const spinner = html`
    <svg class="spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"></circle>
        <path d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" opacity="0.75"></path>
    </svg>
`;

export const renderMensaje = (host) => {
    const err = host.fieldErrors.__mensaje;
    const largo = (host.values.__mensaje || '').length;
    return html`
        <div class="field">
            <div class="label-row">
                <label class="field-label" for="f_mensaje">Describe lo que pasó<span class="required-mark">*</span></label>
                <button type="button" class="tip-btn" aria-label="Mostrar información"
                    aria-expanded=${host.tipOpen ? 'true' : 'false'} aria-controls="tip_mensaje"
                    @click=${() => { host.tipOpen = !host.tipOpen; }}
                    @blur=${() => { host.tipOpen = false; }}>${ICONS.tooltip}</button>
                ${host.tipOpen ? html`<div class="tooltip" id="tip_mensaje" role="tooltip">
                ${ICONS.tooltip}<span>Cuenta qué hacías y qué esperabas. No incluyas CURP, teléfonos ni contraseñas.</span>
            </div>` : ''}
            </div>
            <textarea id="f_mensaje" maxlength=${MAX_MENSAJE} placeholder="Describe lo que pasó"
                aria-invalid=${err ? 'true' : 'false'} aria-describedby="f_mensaje_err"
                .value=${host.values.__mensaje || ''}
                @input=${(e) => host._setValue('__mensaje', e.target.value)}></textarea>
            ${err ? renderError('f_mensaje', err) : html`<div class="field-error counter" id="f_mensaje_err">
                ${largo.toLocaleString('es-MX')} / ${MAX_MENSAJE.toLocaleString('es-MX')}</div>`}
        </div>
    `;
}

export const renderEmail = (host) => {
    const err = host.fieldErrors.__email;
    return html`
        <div class="field">
            <label class="field-label" for="f_email">Correo de contacto${host.emailRequired ? html`<span class="required-mark">*</span>` : ''}</label>
            <input type="email" id="f_email" placeholder="Correo de contacto"
                aria-invalid=${err ? 'true' : 'false'} aria-describedby="f_email_err"
                .value=${host.values.__email || ''}
                @input=${(e) => host._setValue('__email', e.target.value)} />
            ${renderError('f_email', err)}
        </div>
    `;
}

export const renderCaptura = (host) => {
    return html`
        <div class="field">
            <span class="field-label">Captura de pantalla</span>
            <label class="dragger">
                ${ICONS.upload}
                <span>
                    <span class="dragger-title">Sube tu archivo</span>
                    <span class="dragger-help">Da clic para elegir tu archivo <span style="font-size: 10px;">(png y jpg, hasta ${MAX_CAPTURA_MB} MB)</span></span>
                </span>
                <input type="file" accept="image/png,image/jpeg" @change=${(e) => host._handleScreenshot(e)} />
            </label>
            ${host.screenshot ? html`<div class="file-row">
                <span>${host.screenshot.name}</span>
                <button type="button" aria-label="Quitar archivo" @click=${() => { host.screenshot = null; }}>${ICONS.close}</button>
            </div>` : ''}
            ${renderError('f_captura', host.fieldErrors.__captura)}
        </div>
    `;
}

export const renderAcciones = (host) => {
    if (host.rateLimited) {
        return html`<div class="actions"><div class="limit">
            <div class="tip-small" id="tip_limite" role="tooltip">Enviaste varios reportes seguidos. Intenta en unos minutos.</div>
            <button type="button" class="btn btn-primary" disabled aria-describedby="tip_limite">Enviar reporte</button>
        </div></div>`;
    }
    return html`<div class="actions">
        ${host.cancelable ? html`<button type="button" class="btn btn-secondary" @click=${() => host._cancel()}>Cancelar</button>` : ''}
        <button type="submit" class="btn btn-primary" ?disabled=${host.submitting}
            aria-busy=${host.submitting ? 'true' : 'false'}>
            ${host.submitting ? html`${spinner}<span class="sr-only">Enviando</span>` : 'Enviar reporte'}
        </button>
    </div>`;
}
