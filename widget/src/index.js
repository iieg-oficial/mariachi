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
    window.colibri.version = '1.0.0';
}

export { ColibriButton, ColibriTrigger, ColibriForm, ColibriPanel, ColibriFormCore };
