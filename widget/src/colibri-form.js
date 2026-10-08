import { LitElement, html, css } from 'lit';
import { themeCss } from './shared/theme.js';
import { ColibriFormCore } from './shared/form.js';
import { DEFAULT_ENDPOINT } from './shared/api.js';

if (!customElements.get('colibri-form-core')) {
    customElements.define('colibri-form-core', ColibriFormCore);
}


export class ColibriForm extends LitElement {
    static properties = {
        sourceApp: { type: String, attribute: 'source-app' },
        apiKey: { type: String, attribute: 'api-key' },
        endpoint: { type: String },
        endpointTipos: { type: String, attribute: 'endpoint-tipos' },
        layout: { type: String, reflect: true },
        width: { type: String },
        tiposFilter: { type: String, attribute: 'tipos' },
        tipoDefault: { type: String, attribute: 'tipo-default' },
        tipoSelector: { type: String, attribute: 'tipo-selector' },
        submitLabel: { type: String, attribute: 'submit-label' },
        emailRequired: { type: Boolean, attribute: 'email-required' },
        privacyUrl: { type: String, attribute: 'privacy-url' },
    };

    static styles = [
        themeCss,
        css`
            :host { display: block; }
            .container {
                background: var(--colibri-bg);
                color: var(--colibri-fg);
            }
            :host([layout='card']) .container {
                border-radius: var(--colibri-radius-card);
                padding: 32px 40px;
            }
            :host([layout='compact']) .container {
                padding: 16px;
            }
        `,
    ];

    constructor() {
        super();
        this.layout = 'card';
        this.width = '100%';
        this.endpoint = DEFAULT_ENDPOINT;
        this.tipoSelector = 'tabs';
    }

    setTipo(slug) {
        const core = this.renderRoot.querySelector('colibri-form-core');
        if (core) core.tipoSlug = slug;
    }

    setValues(values) {
        const core = this.renderRoot.querySelector('colibri-form-core');
        if (core) core.values = { ...core.values, ...values };
    }

    reset() {
        const core = this.renderRoot.querySelector('colibri-form-core');
        if (core) {
            core.values = {};
            core.success = false;
            core.error = null;
        }
    }

    render() {
        return html`
            <div class="container" style=${`width: ${this.width};`}>
                <colibri-form-core
                    endpoint=${this.endpoint}
                    endpoint-tipos=${this.endpointTipos || ''}
                    api-key=${this.apiKey || ''}
                    source-app=${this.sourceApp || ''}
                    tipos=${this.tiposFilter || ''}
                    tipo-default=${this.tipoDefault || ''}
                    tipo-selector=${this.tipoSelector}
                    privacy-url=${this.privacyUrl || ''}
                    ?email-required=${this.emailRequired}>
                </colibri-form-core>
            </div>
        `;
    }
}
