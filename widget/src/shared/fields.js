import { html } from 'lit';
import { ICONS } from './icons.js';

const input = (type, id, campo, value, invalid, onValue) => html`
    <input type=${type} id=${id} placeholder=${campo.placeholder || campo.label}
        ?required=${campo.required} aria-invalid=${invalid ? 'true' : 'false'}
        aria-describedby=${`${id}_err`}
        maxlength=${campo.maxLength ?? campo.max_length ?? ''}
        .value=${value} @input=${(e) => onValue(e.target.value)} />
`;

const control = (campo, id, value, invalid, onValue) => {
    const options = campo.options || [];
    if (campo.type === 'textarea') {
        return html`<textarea id=${id} placeholder=${campo.placeholder || campo.label}
            ?required=${campo.required} aria-invalid=${invalid ? 'true' : 'false'}
            aria-describedby=${`${id}_err`}
            maxlength=${campo.maxLength ?? campo.max_length ?? ''}
            .value=${value} @input=${(e) => onValue(e.target.value)}></textarea>`;
    }
    if (campo.type === 'select' || campo.type === 'direccion') {
        return html`<select id=${id} ?required=${campo.required} aria-invalid=${invalid ? 'true' : 'false'}
            .value=${value} @change=${(e) => onValue(e.target.value)}>
            <option value="">${campo.placeholder || 'Selecciona…'}</option>
            ${options.map((o) => html`<option value=${o.value} ?selected=${value === o.value}>${o.label}</option>`)}
        </select>`;
    }
    if (campo.type === 'multiselect') {
        const arr = Array.isArray(value) ? value : [];
        return html`<select id=${id} multiple
            @change=${(e) => onValue([...e.target.selectedOptions].map((o) => o.value))}>
            ${options.map((o) => html`<option value=${o.value} ?selected=${arr.includes(o.value)}>${o.label}</option>`)}
        </select>`;
    }
    if (campo.type === 'radio') {
        return html`<div role="radiogroup" aria-label=${campo.label} class="tipo-selector">
            ${options.map((o) => html`<button type="button" class="tipo-chip"
                aria-pressed=${value === o.value ? 'true' : 'false'}
                @click=${() => onValue(o.value)}>${o.label}</button>`)}
        </div>`;
    }
    if (campo.type === 'checkbox') {
        return html`<div class="consent" style="margin-top: 12px;">
            <input type="checkbox" id=${id} ?checked=${Boolean(value)}
                @change=${(e) => onValue(e.target.checked)} />
            <label for=${id}>${campo.placeholder || 'Sí'}</label>
        </div>`;
    }
    const tipos = { number: 'number', email: 'email', url: 'url' };
    return input(tipos[campo.type] || 'text', id, campo, value, invalid, onValue);
};

export const renderError = (id, message) => html`
    <div class="field-error" id=${`${id}_err`}>
        ${message ? html`${ICONS.error}<span role="alert">${message}</span>` : ''}
    </div>
`;

export const renderField = (campo, value, error, onValue) => {
    const id = `f_${campo.key}`;
    const helpText = campo.helpText ?? campo.help_text;
    const isGroup = campo.type === 'checkbox' || campo.type === 'radio';
    return html`
        <div class="field">
            ${isGroup
                ? html`<span class="field-label">${campo.label}${campo.required ? html`<span class="required-mark">*</span>` : ''}</span>`
                : html`<label class="field-label" for=${id}>${campo.label}${campo.required ? html`<span class="required-mark">*</span>` : ''}</label>`}
            ${helpText ? html`<span class="description">${helpText}</span>` : ''}
            ${control(campo, id, value ?? '', Boolean(error), onValue)}
            ${renderError(id, error)}
        </div>
    `;
};
