import { LitElement, html, css } from 'lit';
import { themeCss } from './shared/theme.js';
import { ICONS } from './shared/icons.js';
import { ColibriPanel } from './shared/panel.js';

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

            :host([as='link']) .trigger { color: var(--colibri-primary); text-decoration: underline; }
            :host([as='text']) .trigger { color: inherit; }
            :host([as='icon']) .trigger {
                color: var(--colibri-muted);
                padding: 4px;
                border-radius: 4px;
            }
            :host([as='icon']) .trigger:hover { color: var(--colibri-primary); background: var(--colibri-border); }
            :host([as='chip']) .trigger {
                border: 1px solid var(--colibri-border);
                border-radius: 999px;
                padding: 4px 12px;
                font-size: 12px;
            }
            :host([as='chip']) .trigger:hover { border-color: var(--colibri-primary); color: var(--colibri-primary); }
            :host([as='menu-item']) .trigger {
                width: 100%;
                padding: 8px 12px;
                justify-content: flex-start;
                border-radius: 4px;
                text-align: left;
            }
            :host([as='menu-item']) .trigger:hover { background: var(--colibri-border); }

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
        this.endpoint = '/api/public/reportes';
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
                ?email-required=${this.emailRequired}
                @colibri:closed=${() => this._open = false}>
            </colibri-panel>
        `;
    }
}
