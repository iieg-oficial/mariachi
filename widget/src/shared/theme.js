import { css } from 'lit';

export const themeCss = css`
    :host {
        --colibri-primary: #5C2472;
        --colibri-primary-shadow: 0 8px 16px rgba(70, 21, 82, 0.3);
        --colibri-primary-soft: #F0E2F5;
        --colibri-on-primary: #FFFFFF;
        --colibri-fg: #191919;
        --colibri-text: #465055;
        --colibri-muted: #6B6B6B;
        --colibri-bg: #FFFFFF;
        --colibri-field-bg: #F8F8F8;
        --colibri-secondary-bg: #E2E2E2;
        --colibri-secondary-hover: #CECDCD;
        --colibri-disabled-bg: #CBCBCB;
        --colibri-disabled-fg: #5B6670;
        --colibri-check-border: #CCD3E2;
        --colibri-danger: #B3261E;
        --colibri-danger-line: #EA4336;
        --colibri-success-soft: #CCFFD2;
        --colibri-chip-active-bg: #FFE9CC;
        --colibri-chip-active-fg: #9E5200;
        --colibri-accent: #FF8300;
        --colibri-tip-small-bg: #5B6670;
        --colibri-radius-field: 8px;
        --colibri-radius-card: 16px;
        --colibri-radius-pill: 20px;
        --colibri-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
        --colibri-shadow-tooltip: 0 3px 12px rgba(70, 21, 82, 0.3);
        --colibri-font: 'Garet', 'GaretMedium', system-ui, sans-serif;
        font-family: var(--colibri-font);
        color: var(--colibri-fg);
        box-sizing: border-box;
    }

    *, *::before, *::after { box-sizing: border-box; }

    button {
        font-family: inherit;
        cursor: pointer;
    }

    button:focus-visible, a:focus-visible {
        outline: 2px solid var(--colibri-primary);
        outline-offset: 2px;
    }
`;
