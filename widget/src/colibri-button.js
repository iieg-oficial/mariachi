import { LitElement, html, css } from 'lit';
import { themeCss } from './shared/theme.js';
import { ICONS } from './shared/icons.js';
import { ColibriPanel } from './shared/panel.js';
import { DEFAULT_ENDPOINT } from './shared/api.js';

if (!customElements.get('colibri-panel')) {
    customElements.define('colibri-panel', ColibriPanel);
}

const SIZE_PX = { sm: 36, md: 48, lg: 60 };

const POSITION_STYLES = {
    'bottom-right': 'bottom: var(--offset-y, var(--offset)); right: var(--offset-x, var(--offset));',
    'bottom-left': 'bottom: var(--offset-y, var(--offset)); left: var(--offset-x, var(--offset));',
    'top-right': 'top: var(--offset-y, var(--offset)); right: var(--offset-x, var(--offset));',
    'top-left': 'top: var(--offset-y, var(--offset)); left: var(--offset-x, var(--offset));',
};


export class ColibriButton extends LitElement {
    static properties = {
        sourceApp: { type: String, attribute: 'source-app' },
        apiKey: { type: String, attribute: 'api-key' },
        endpoint: { type: String },
        endpointTipos: { type: String, attribute: 'endpoint-tipos' },
        position: { type: String, reflect: true },
        size: { type: String, reflect: true },
        offset: { type: String },
        label: { type: String },
        icon: { type: String },
        color: { type: String },
        shape: { type: String, reflect: true },
        shadow: { type: String, reflect: true },
        tiposFilter: { type: String, attribute: 'tipos' },
        emailRequired: { type: Boolean, attribute: 'email-required' },
        privacyUrl: { type: String, attribute: 'privacy-url' },
        zIndex: { type: Number, attribute: 'z-index' },
        _open: { type: Boolean, attribute: false },
    };

    static styles = [
        themeCss,
        css`
            :host {
                --offset: 24px;
                --size: 48px;
                --color: var(--colibri-primary);
            }
            :host([size='sm']) { --size: 36px; }
            :host([size='lg']) { --size: 60px; }

            .fab {
                position: fixed;
                z-index: 2147483000;
                width: var(--size);
                height: var(--size);
                border-radius: 50%;
                background: var(--color);
                color: var(--colibri-on-primary);
                border: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 0 14px;
                box-shadow: var(--colibri-shadow);
                transition: transform 0.15s, box-shadow 0.15s;
                font-size: 14px;
                font-weight: 700;
                font-family: inherit;
            }
            :host([shape='pill']) .fab {
                width: auto;
                border-radius: 999px;
                height: var(--size);
                padding: 0 18px;
            }
            :host([shape='square']) .fab {
                border-radius: var(--colibri-radius-field);
            }
            .fab:hover { box-shadow: var(--colibri-primary-shadow); }
            .fab:focus-visible { outline: 2px solid var(--colibri-primary); outline-offset: 3px; }
            .fab svg { width: 50%; height: 50%; }
            :host([shape='pill']) .fab svg { width: 18px; height: 18px; }

            :host([shadow='none']) .fab { box-shadow: none; }
            :host([shadow='sm']) .fab { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            :host([shadow='lg']) .fab { box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
        `,
    ];

    constructor() {
        super();
        this.position = 'bottom-right';
        this.size = 'md';
        this.offset = '24px';
        this.label = '';
        this.icon = 'bug';
        this.color = '';
        this.shape = 'circle';
        this.shadow = 'md';
        this.endpoint = DEFAULT_ENDPOINT;
        this._open = false;
    }

    open(opts = {}) {
        this._open = true;
        this._initialTipo = opts.tipo || null;
        this.dispatchEvent(new CustomEvent('colibri:opened', { bubbles: true, composed: true }));
        this.updateComplete.then(() => {
            const panel = this.renderRoot.querySelector('colibri-panel');
            panel?.show?.();
        });
    }

    close() {
        this._open = false;
    }

    async report(payload) {
        const { postReporte, captureAuto } = await import('./shared/api.js');
        return postReporte({
            endpoint: this.endpoint,
            apiKey: this.apiKey,
            payload: {
                tipo: payload.tipo,
                mensaje: payload.mensaje,
                email_contacto: payload.email || null,
                source_app: this.sourceApp,
                source_route: location.pathname + location.search,
                source_context: { auto: captureAuto(), ...payload.context },
                respuestas: payload.respuestas || null,
            },
        });
    }

    _renderIcon() {
        if (!this.icon || this.icon === 'none') return '';
        const builtIn = ICONS[this.icon];
        if (builtIn) return builtIn;
        return html`<img src=${this.icon} alt="" style="width:50%;height:50%;object-fit:contain;" />`;
    }

    render() {
        const positionStyle = POSITION_STYLES[this.position] || POSITION_STYLES['bottom-right'];
        const offsetStyle = `--offset: ${this.offset};`;
        const colorStyle = this.color ? `--color: ${this.color};` : '';
        const zIndexStyle = this.zIndex ? `z-index: ${this.zIndex};` : '';

        return html`
            <button
                class="fab"
                style=${[positionStyle, offsetStyle, colorStyle, zIndexStyle].join(' ')}
                @click=${() => this.open()}
                aria-label=${this.label || 'Reportar'}>
                ${this._renderIcon()}
                ${this.label ? html`<span>${this.label}</span>` : ''}
            </button>

            <colibri-panel
                ?open=${this._open}
                endpoint=${this.endpoint}
                endpoint-tipos=${this.endpointTipos || ''}
                api-key=${this.apiKey || ''}
                source-app=${this.sourceApp || ''}
                tipos=${this.tiposFilter || ''}
                tipo-default=${this._initialTipo || ''}
                privacy-url=${this.privacyUrl || ''}
                ?email-required=${this.emailRequired}
                @colibri:closed=${() => this._open = false}>
            </colibri-panel>
        `;
    }
}
