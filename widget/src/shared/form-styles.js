import { css } from 'lit';

export const formCss = css`
    :host { display: block; }

    .field { margin-top: 16px; position: relative; }
    .field:first-child { margin-top: 0; }
    .label-row { display: flex; align-items: center; gap: 16px; position: relative; }
    .field-label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: var(--colibri-fg);
    }
    .required-mark { color: var(--colibri-danger); margin-left: 4px; }
    .description {
        display: block;
        margin-top: 8px;
        font-size: 12px;
        color: var(--colibri-text);
    }

    input[type='text'], input[type='email'], input[type='url'],
    input[type='number'], textarea, select {
        display: block;
        width: 100%;
        margin-top: 12px;
        padding: 0 16px;
        height: 40px;
        border: 1px solid transparent;
        border-radius: var(--colibri-radius-field);
        background: var(--colibri-field-bg);
        color: var(--colibri-primary);
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        outline: none;
        transition: background 0.15s, box-shadow 0.15s;
    }
    textarea { height: auto; min-height: 120px; padding: 8px 16px; line-height: 20px; resize: vertical; }
    select[multiple] { height: auto; padding: 8px 16px; }
    input::placeholder, textarea::placeholder { color: var(--colibri-muted); font-weight: 400; }
    input:hover, textarea:hover, select:hover {
        background: var(--colibri-bg);
        border-color: var(--colibri-primary);
        box-shadow: 0 2px 24px rgba(182, 166, 188, 0.6);
    }
    input:focus, textarea:focus, select:focus {
        background: var(--colibri-bg);
        box-shadow: 0 0 0 1px var(--colibri-primary);
    }
    [aria-invalid='true'] { background: var(--colibri-bg); border-color: var(--colibri-danger-line); }

    .field-error {
        min-height: 17px;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 500;
        color: var(--colibri-danger);
    }
    .field-error svg { width: 14px; height: 14px; flex-shrink: 0; }
    .counter { justify-content: flex-end; color: var(--colibri-text); }

    .tip-btn {
        width: 20px;
        height: 20px;
        padding: 0;
        border: 0;
        border-radius: 9999px;
        background: transparent;
        display: inline-flex;
    }
    .tip-btn svg { width: 20px; height: 20px; }
    .tooltip {
        position: absolute;
        left: 0;
        bottom: calc(100% + 8px);
        z-index: 2;
        display: flex;
        gap: 24px;
        width: min(406px, 100%);
        padding: 16px 28px;
        border-radius: 10px;
        background: var(--colibri-field-bg);
        color: var(--colibri-fg);
        font-size: 12px;
        line-height: 21px;
        font-weight: 500;
        box-shadow: var(--colibri-shadow-tooltip);
    }
    .tooltip svg { width: 20px; height: 20px; flex-shrink: 0; }

    .tipo-selector { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .tipo-chip {
        height: 30px;
        padding: 4px 16px;
        border: 0;
        border-radius: var(--colibri-radius-field);
        background: var(--colibri-field-bg);
        color: var(--colibri-text);
        font-size: 16px;
        font-weight: 700;
    }
    .tipo-chip[aria-pressed='true'] {
        background: var(--colibri-chip-active-bg);
        color: var(--colibri-chip-active-fg);
        box-shadow: 0 0 0 1px var(--colibri-accent);
    }

    .dragger {
        margin-top: 8px;
        display: flex;
        align-items: center;
        gap: 24px;
        padding: 16px 24px;
        border: 1px dashed var(--colibri-primary);
        border-radius: var(--colibri-radius-card);
        background: var(--colibri-bg);
        cursor: pointer;
    }
    .dragger:hover { background: var(--colibri-field-bg); }
    .dragger:focus-within { outline: 2px solid var(--colibri-primary); outline-offset: 2px; }
    .dragger > svg { width: 52px; height: 52px; flex-shrink: 0; }
    .dragger-title { display: block; font-size: 20px; line-height: 24px; font-weight: 700; color: var(--colibri-primary); }
    .dragger-help { display: block; font-size: 12px; font-weight: 500; color: var(--colibri-text); }
    .dragger input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .file-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 12px; color: var(--colibri-primary); }
    .file-row button { border: 0; background: transparent; color: var(--colibri-text); padding: 4px; border-radius: 9999px; }
    .file-row button:hover { background: var(--colibri-primary-soft); color: var(--colibri-primary); }
    .file-row svg { width: 14px; height: 14px; }

    .consent { display: flex; align-items: center; gap: 12px; margin-top: 20px; }
    .consent input {
        width: 20px;
        height: 20px;
        margin: 0;
        flex-shrink: 0;
        appearance: none;
        border: 1px solid var(--colibri-check-border);
        border-radius: 2px;
        background: var(--colibri-bg);
        cursor: pointer;
        display: grid;
        place-content: center;
    }
    .consent input:hover { border-color: var(--colibri-primary); }
    .consent input:checked { background: var(--colibri-primary); border-color: var(--colibri-primary); }
    .consent input:checked::before { content: '✔'; color: var(--colibri-on-primary); font-size: 14px; }
    .consent input:focus-visible { outline: 2px solid var(--colibri-primary); outline-offset: 2px; }
    .consent label { font-size: 12px; font-weight: 500; color: var(--colibri-fg); }
    .consent a { color: var(--colibri-primary); }

    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 28px; }
    .btn {
        height: 40px;
        min-width: 160px;
        padding: 0 24px;
        border: 0;
        border-radius: var(--colibri-radius-pill);
        font-size: 14px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: box-shadow 0.15s, background 0.15s;
    }
    .btn-primary { background: var(--colibri-primary); color: var(--colibri-on-primary); min-width: 200px; }
    .btn-primary:hover:not(:disabled) { box-shadow: var(--colibri-primary-shadow); }
    .btn-secondary { background: var(--colibri-secondary-bg); color: var(--colibri-text); }
    .btn-secondary:hover { background: var(--colibri-secondary-hover); }
    .btn:disabled { background: var(--colibri-disabled-bg); color: var(--colibri-disabled-fg); cursor: not-allowed; }
    .btn[aria-busy='true'] { background: var(--colibri-primary); cursor: progress; }
    .spinner { width: 24px; height: 24px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .tip-small {
        max-width: 280px;
        padding: 4px 8px;
        border-radius: 4px;
        background: var(--colibri-tip-small-bg);
        color: var(--colibri-on-primary);
        font-size: 10px;
        font-weight: 700;
        text-align: center;
    }
    .limit { display: flex; flex-direction: column; align-items: center; gap: 6px; }

    .state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 24px 0;
        text-align: center;
    }
    .state-badge {
        width: 80px;
        height: 80px;
        border-radius: 9999px;
        background: var(--colibri-success-soft);
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .state-badge svg { width: 40px; height: 40px; }
    .state > svg { width: 80px; height: 80px; }
    .state-title { margin: 0; font-size: 21px; font-weight: 700; color: var(--colibri-primary); }
    .state-msg { margin: 0; font-size: 14px; color: var(--colibri-text); }
    .loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px 0; font-size: 12px; font-weight: 500; color: var(--colibri-text); }
    .loading .spinner { color: var(--colibri-primary); width: 32px; height: 32px; }

    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;
