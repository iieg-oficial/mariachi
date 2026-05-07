import { css } from 'lit';

export const themeCss = css`
    :host {
        --colibri-bg: #ffffff;
        --colibri-fg: #1f1f1f;
        --colibri-muted: #888888;
        --colibri-border: #e5e5e5;
        --colibri-primary: #7c3aed;
        --colibri-primary-fg: #ffffff;
        --colibri-danger: #dc2626;
        --colibri-radius: 10px;
        --colibri-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
        --colibri-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-family: var(--colibri-font);
        color: var(--colibri-fg);
        box-sizing: border-box;
    }

    :host([theme='dark']) {
        --colibri-bg: #1f1f1f;
        --colibri-fg: #f5f5f5;
        --colibri-muted: #aaaaaa;
        --colibri-border: #333333;
        --colibri-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
    }

    @media (prefers-color-scheme: dark) {
        :host([theme='auto']) {
            --colibri-bg: #1f1f1f;
            --colibri-fg: #f5f5f5;
            --colibri-muted: #aaaaaa;
            --colibri-border: #333333;
            --colibri-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
        }
    }

    *, *::before, *::after { box-sizing: border-box; }

    button {
        font-family: inherit;
        cursor: pointer;
    }
`;
