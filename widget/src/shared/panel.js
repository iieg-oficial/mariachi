import { LitElement, html, css } from 'lit';
import { themeCss } from './theme.js';
import { ICONS } from './icons.js';
import { ColibriFormCore } from './form.js';

if (!customElements.get('colibri-form-core')) {
    customElements.define('colibri-form-core', ColibriFormCore);
}

const FOCUSABLES = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

const focusables = (root) => {
    const propios = [...root.querySelectorAll(FOCUSABLES)];
    const form = root.querySelector('colibri-form-core');
    const internos = form?.shadowRoot ? [...form.shadowRoot.querySelectorAll(FOCUSABLES)] : [];
    return [...propios, ...internos];
};


export class ColibriPanel extends LitElement {
    static properties = {
        open: { type: Boolean, reflect: true },
        endpoint: { type: String },
        endpointTipos: { type: String, attribute: 'endpoint-tipos' },
        apiKey: { type: String, attribute: 'api-key' },
        sourceApp: { type: String, attribute: 'source-app' },
        tiposFilter: { type: String, attribute: 'tipos' },
        tipoDefault: { type: String, attribute: 'tipo-default' },
        emailRequired: { type: Boolean, attribute: 'email-required' },
        privacyUrl: { type: String, attribute: 'privacy-url' },
    };

    static styles = [
        themeCss,
        css`
            :host { display: contents; }
            .backdrop {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.4);
                z-index: 2147483000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
                animation: fade-in 0.15s ease-out;
            }
            .panel {
                background: var(--colibri-bg);
                color: var(--colibri-fg);
                width: 100%;
                max-width: 580px;
                max-height: 90vh;
                border-radius: var(--colibri-radius-card);
                box-shadow: var(--colibri-shadow);
                display: flex;
                flex-direction: column;
                animation: slide-up 0.2s ease-out;
                outline: none;
            }
            .header { display: flex; align-items: flex-start; gap: 16px; padding: 32px 40px 0; }
            .heading { flex-grow: 1; display: flex; flex-direction: column; gap: 6px; }
            .title { margin: 0; font-size: 22px; font-weight: 700; color: var(--colibri-primary); }
            .subtitle { font-size: 12px; color: var(--colibri-text); }
            .close-btn {
                width: 40px;
                height: 40px;
                flex-shrink: 0;
                border: 0;
                border-radius: 9999px;
                background: transparent;
                color: var(--colibri-primary);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .close-btn:hover { background: var(--colibri-primary-soft); }
            .close-btn svg { width: 18px; height: 18px; }
            .body { padding: 16px 40px 32px; overflow-y: auto; }
            @media (max-width: 480px) {
                .backdrop { align-items: flex-end; padding: 0; }
                .panel { max-height: 94vh; border-radius: var(--colibri-radius-card) var(--colibri-radius-card) 0 0; }
                .header { padding: 24px 20px 0; }
                .body { padding: 12px 20px 28px; }
            }
            @media (prefers-reduced-motion: reduce) {
                .backdrop, .panel { animation: none; }
            }
            @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slide-up {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `,
    ];

    constructor() {
        super();
        this.open = false;
        this._onKeydown = this._onKeydown.bind(this);
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('keydown', this._onKeydown);
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this._onKeydown);
        super.disconnectedCallback();
    }

    updated(changed) {
        if (!changed.has('open')) return;
        if (this.open) {
            this._previo = document.activeElement;
            requestAnimationFrame(() => this.renderRoot.querySelector('.panel')?.focus());
        } else if (changed.get('open')) {
            this._previo?.focus?.();
        }
    }

    _onKeydown(e) {
        if (!this.open) return;
        if (e.key === 'Escape') {
            this.close();
            return;
        }
        if (e.key !== 'Tab') return;
        const lista = focusables(this.renderRoot);
        if (!lista.length) return;
        const activo = this.renderRoot.activeElement?.shadowRoot?.activeElement || this.renderRoot.activeElement;
        const primero = lista[0];
        const ultimo = lista[lista.length - 1];
        if (e.shiftKey && activo === primero) {
            e.preventDefault();
            ultimo.focus();
        } else if (!e.shiftKey && activo === ultimo) {
            e.preventDefault();
            primero.focus();
        }
    }

    show() { this.open = true; }

    close() {
        this.open = false;
        this.dispatchEvent(new CustomEvent('colibri:closed', { bubbles: true, composed: true }));
    }

    _onBackdrop(e) {
        if (e.target === e.currentTarget) this.close();
    }

    render() {
        if (!this.open) return html``;
        return html`
            <div class="backdrop" @click=${this._onBackdrop}>
                <div class="panel" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="colibri_titulo" aria-describedby="colibri_sub">
                    <div class="header">
                        <div class="heading">
                            <h2 class="title" id="colibri_titulo">Enviar reporte</h2>
                            <span class="subtitle" id="colibri_sub">Llega directo al equipo que mantiene este sitio.</span>
                        </div>
                        <button type="button" class="close-btn" @click=${this.close} aria-label="Cerrar">${ICONS.close}</button>
                    </div>
                    <div class="body">
                        <colibri-form-core
                            cancelable
                            endpoint=${this.endpoint || ''}
                            endpoint-tipos=${this.endpointTipos || ''}
                            api-key=${this.apiKey || ''}
                            source-app=${this.sourceApp || ''}
                            tipos=${this.tiposFilter || ''}
                            tipo-default=${this.tipoDefault || ''}
                            privacy-url=${this.privacyUrl || ''}
                            ?email-required=${this.emailRequired}
                            @colibri:cancel=${this.close}>
                        </colibri-form-core>
                    </div>
                </div>
            </div>
        `;
    }
}
