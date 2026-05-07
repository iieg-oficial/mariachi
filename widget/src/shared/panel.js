import { LitElement, html, css } from 'lit';
import { themeCss } from './theme.js';
import { ICONS } from './icons.js';
import './form.js';
import { ColibriFormCore } from './form.js';

if (!customElements.get('colibri-form-core')) {
    customElements.define('colibri-form-core', ColibriFormCore);
}


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
                max-width: 480px;
                max-height: 85vh;
                border-radius: var(--colibri-radius);
                box-shadow: var(--colibri-shadow);
                display: flex;
                flex-direction: column;
                animation: slide-up 0.2s ease-out;
            }
            .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 16px;
                border-bottom: 1px solid var(--colibri-border);
            }
            .title { font-size: 15px; font-weight: 600; margin: 0; }
            .close-btn {
                background: transparent;
                border: none;
                padding: 4px;
                color: var(--colibri-muted);
                display: flex;
                align-items: center;
                border-radius: 6px;
            }
            .close-btn:hover { color: var(--colibri-fg); background: var(--colibri-border); }
            .close-btn svg { width: 18px; height: 18px; }
            .body { padding: 16px; overflow-y: auto; }
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

    _onKeydown(e) {
        if (e.key === 'Escape' && this.open) this.close();
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
                <div class="panel" role="dialog" aria-modal="true">
                    <div class="header">
                        <h3 class="title">Enviar reporte</h3>
                        <button class="close-btn" @click=${this.close} aria-label="Cerrar">
                            ${ICONS.close}
                        </button>
                    </div>
                    <div class="body">
                        <colibri-form-core
                            endpoint=${this.endpoint || ''}
                            endpoint-tipos=${this.endpointTipos || ''}
                            api-key=${this.apiKey || ''}
                            source-app=${this.sourceApp || ''}
                            tipos=${this.tiposFilter || ''}
                            tipo-default=${this.tipoDefault || ''}
                            ?email-required=${this.emailRequired}>
                        </colibri-form-core>
                    </div>
                </div>
            </div>
        `;
    }
}
