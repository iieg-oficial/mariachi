import { LitElement, html, css } from 'lit';
import { themeCss } from './shared/theme.js';
import { ICONS } from './shared/icons.js';
import { ColibriPanel } from './shared/panel.js';
import { DEFAULT_ENDPOINT } from './shared/api.js';

if (!customElements.get('colibri-panel')) {
    customElements.define('colibri-panel', ColibriPanel);
}


export class ColibriTrigger extends LitElement {
    static properties = {
        sourceApp: { type: String, attribute: 'source-app' },
        apiKey: { type: String, attribute: 'api-key' },
        endpoint: { type: String },
        endpointTipos: { type: String, attribute: 'endpoint-tipos' },
        as: { type: String, reflect: true },
        label: { type: String },
        icon: { type: String },
        iconPosition: { type: String, attribute: 'icon-position' },
        color: { type: String },
        underline: { type: String, reflect: true },
        fontSize: { type: String, attribute: 'font-size' },
        tiposFilter: { type: String, attribute: 'tipos' },
        tipoDefault: { type: String, attribute: 'tipo-default' },
        emailRequired: { type: Boolean, attribute: 'email-required' },
        privacyUrl: { type: String, attribute: 'privacy-url' },
        _open: { type: Boolean, attribute: false },
    };

    static styles = [
        themeCss,
        css`
            :host {
                display: inline;
                color: inherit;
            }
            .trigger {
                background: transparent;
                border: none;
                padding: 0;
                color: inherit;
                font: inherit;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
            }
            .trigger svg { width: 1em; height: 1em; vertical-align: -0.125em; }
            .trigger:focus-visible { outline: 2px solid var(--colibri-primary); outline-offset: 2px; border-radius: 4px; }

            :host([as='link']) .trigger { color: var(--colibri-primary); text-decoration: underline; }
            :host([as='text']) .trigger { color: inherit; }
            :host([as='icon']) .trigger {
                width: 40px;
                height: 40px;
                justify-content: center;
                color: var(--colibri-primary);
                border-radius: 9999px;
            }
            :host([as='icon']) .trigger svg { width: 20px; height: 20px; }
            :host([as='icon']) .trigger:hover { background: var(--colibri-primary-soft); }
            :host([as='chip']) .trigger {
                height: 30px;
                padding: 4px 16px;
                border-radius: var(--colibri-radius-field);
                background: var(--colibri-field-bg);
                color: var(--colibri-text);
                font-size: 14px;
                font-weight: 700;
            }
            :host([as='chip']) .trigger:hover { box-shadow: 0 0 0 1px var(--colibri-primary); color: var(--colibri-primary); }
            :host([as='menu-item']) .trigger {
                width: 100%;
                min-height: 40px;
                padding: 8px 16px;
                justify-content: flex-start;
                border-radius: var(--colibri-radius-field);
                text-align: left;
            }
            :host([as='menu-item']) .trigger:hover { background: var(--colibri-field-bg); color: var(--colibri-primary); }

            :host([underline='always']) .trigger { text-decoration: underline; }
            :host([underline='never']) .trigger { text-decoration: none !important; }
            :host([underline='hover']) .trigger { text-decoration: none; }
            :host([underline='hover']) .trigger:hover { text-decoration: underline; }
        `,
    ];

    constructor() {
        super();
        this.as = 'link';
        this.label = '';
        this.icon = '';
        this.iconPosition = 'left';
        this.underline = 'auto';
        this.endpoint = DEFAULT_ENDPOINT;
        this._open = false;
    }

    open(opts = {}) {
        this._open = true;
        this._initialTipo = opts.tipo || this.tipoDefault || null;
        this.dispatchEvent(new CustomEvent('colibri:opened', { bubbles: true, composed: true }));
        this.updateComplete.then(() => {
            const panel = this.renderRoot.querySelector('colibri-panel');
            panel?.show?.();
        });
    }

    close() { this._open = false; }

    _renderIcon() {
        if (!this.icon) return '';
        const builtIn = ICONS[this.icon];
        if (builtIn) return builtIn;
        return html`<img src=${this.icon} alt="" style="width:1em;height:1em;" />`;
    }

    render() {
        const colorStyle = this.color && this.color !== 'inherit' ? `color: ${this.color};` : '';
        const sizeStyle = this.fontSize && this.fontSize !== 'inherit' ? `font-size: ${this.fontSize};` : '';
        const isIconOnly = this.as === 'icon' || (!this.label && this.icon);
        const showIcon = this.icon && this.icon !== 'none';

        return html`
            <button
                class="trigger"
                style=${[colorStyle, sizeStyle].join(' ')}
                @click=${() => this.open()}
                aria-label=${this.label || 'Reportar'}>
                ${showIcon && this.iconPosition === 'left' ? this._renderIcon() : ''}
                ${!isIconOnly && this.label ? html`<span>${this.label}</span>` : ''}
                ${showIcon && this.iconPosition === 'right' ? this._renderIcon() : ''}
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
