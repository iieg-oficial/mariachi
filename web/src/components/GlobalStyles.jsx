import { useEffect } from 'react';
import { useGlobal } from '@hooks/useGlobal';

function GlobalStyles() {
    const { globalStyles } = useGlobal();

    useEffect(() => {
        if (!globalStyles || Object.keys(globalStyles).length === 0) {
            return;
        }

        const styleElement = document.createElement('style');
        styleElement.id = 'global-dynamic-styles';

        let css = '';

        if (globalStyles.typography) {
            const { headingFont, bodyFont, buttonFont } = globalStyles.typography;

            if (headingFont) {
                css += `
                h1, h2, h3, h4, h5, h6 {
                    font-family: '${headingFont}', sans-serif !important;
                }
                `;
            }

            if (bodyFont) {
                css += `
                body, p, div, span, li {
                    font-family: '${bodyFont}', sans-serif !important;
                }
                `;
            }

            if (buttonFont) {
                css += `
                button, .btn, a.button {
                    font-family: '${buttonFont}', sans-serif !important;
                }
                `;
            }

            if (globalStyles.typography.fontSize) {
                const { h1, h2, h3, base } = globalStyles.typography.fontSize;

                if (h1) css += `h1 { font-size: ${h1}px !important; }`;
                if (h2) css += `h2 { font-size: ${h2}px !important; }`;
                if (h3) css += `h3 { font-size: ${h3}px !important; }`;
                if (base) css += `body, p { font-size: ${base}px !important; }`;
            }
        }

        if (globalStyles.colors) {
            const { primary, secondary, accent, textPrimary, textSecondary, background } = globalStyles.colors;

            css += `
            :root {
                ${primary ? `--color-primary: ${primary};` : ''}
                ${secondary ? `--color-secondary: ${secondary};` : ''}
                ${accent ? `--color-accent: ${accent};` : ''}
                ${textPrimary ? `--color-text-primary: ${textPrimary};` : ''}
                ${textSecondary ? `--color-text-secondary: ${textSecondary};` : ''}
                ${background ? `--color-background: ${background};` : ''}
            }
            `;

            if (background) {
                css += `body { background-color: ${background} !important; }`;
            }
            if (textPrimary) {
                css += `body, p { color: ${textPrimary} !important; }`;
            }
        }

        styleElement.textContent = css;

        const existingStyles = document.getElementById('global-dynamic-styles');
        if (existingStyles) {
            existingStyles.remove();
        }

        document.head.appendChild(styleElement);

        return () => {
            const styles = document.getElementById('global-dynamic-styles');
            if (styles) {
                styles.remove();
            }
        };
    }, [globalStyles]);

    return null;
}

export default GlobalStyles;
