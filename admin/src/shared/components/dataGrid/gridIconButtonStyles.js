export const GRID_ICON_BUTTON_STYLES = `
    .grid-icon-btn.ant-btn { padding-inline: 7px; gap: 0; }
    .grid-icon-btn .grid-icon-btn-label {
        display: inline-block;
        max-width: 0;
        overflow: hidden;
        white-space: nowrap;
        vertical-align: bottom;
        transition: max-width 0.2s ease, margin-left 0.2s ease;
    }
    .grid-icon-btn:hover .grid-icon-btn-label,
    .grid-icon-btn:focus-visible .grid-icon-btn-label,
    .grid-icon-btn.grid-icon-btn-expanded .grid-icon-btn-label {
        max-width: 220px;
        margin-left: 6px;
    }
`;
