import { ColibriButton } from './colibri-button.js';
import { ColibriTrigger } from './colibri-trigger.js';
import { ColibriForm } from './colibri-form.js';
import { ColibriPanel } from './shared/panel.js';
import { ColibriFormCore } from './shared/form.js';

const define = (name, ctor) => {
    if (!customElements.get(name)) customElements.define(name, ctor);
};

define('colibri-form-core', ColibriFormCore);
define('colibri-panel', ColibriPanel);
define('colibri-button', ColibriButton);
define('colibri-trigger', ColibriTrigger);
define('colibri-form', ColibriForm);

if (typeof window !== 'undefined') {
    if (!window.colibri) window.colibri = {};
    window.colibri.identify = (user) => {
        window.colibri.__userIdentify = user;
    };
    window.colibri.setContext = (key, value) => {
        if (!window.colibri.__customContext) window.colibri.__customContext = {};
        if (value === null || value === undefined) {
            delete window.colibri.__customContext[key];
        } else {
            window.colibri.__customContext[key] = value;
        }
    };
    window.colibri.clearContext = () => {
        window.colibri.__customContext = {};
    };
    window.colibri.openPanel = (opts = {}) => {
        if (!opts.sourceApp || !opts.apiKey) {
            console.warn('colibri.openPanel: sourceApp y apiKey son requeridos');
            return null;
        }
        const panel = document.createElement('colibri-panel');
        panel.setAttribute('source-app', opts.sourceApp);
        panel.setAttribute('api-key', opts.apiKey);
        if (opts.endpoint) panel.setAttribute('endpoint', opts.endpoint);
        if (opts.endpointTipos) panel.setAttribute('endpoint-tipos', opts.endpointTipos);
        if (opts.tipos) panel.setAttribute('tipos', opts.tipos);
        if (opts.tipoDefault) panel.setAttribute('tipo-default', opts.tipoDefault);
        if (opts.emailRequired) panel.setAttribute('email-required', '');
        if (opts.privacyUrl) panel.setAttribute('privacy-url', opts.privacyUrl);
        document.body.appendChild(panel);
        panel.addEventListener('colibri:closed', () => {
            setTimeout(() => panel.remove(), 300);
        });
        requestAnimationFrame(() => panel.show?.());
        return panel;
    };
    window.colibri.version = '1.0.0';
}

export { ColibriButton, ColibriTrigger, ColibriForm, ColibriPanel, ColibriFormCore };
