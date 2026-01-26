import apiService from './apiService';

export const getFonts = async () => {
    try {
        const response = await apiService.get('/fonts');
        return response.data;
    } catch (error) {
        console.error('Error fetching fonts:', error);
        return [];
    }
};


export const generateFontFaceCSS = (font) => {
    return `
        @font-face {
        font-family: '${font.family}';
        src: url('${font.url}') format('${font.format}');
        font-weight: ${font.weight};
        font-style: ${font.style};
        font-display: swap;
    }`.trim();
};

export const loadFont = (font) => {
    const styleId = `font-${font.id}`;

    if (document.getElementById(styleId)) {
        return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = generateFontFaceCSS(font);
    document.head.appendChild(style);
};

export const loadFontFamily = (family, allFonts) => {
    if (!family) return;

    const fonts = allFonts.filter(f => f.family === family);
    fonts.forEach(font => loadFont(font));
};

export const loadAllFonts = async () => {
    try {
        const fonts = await getFonts();
        fonts.forEach(font => loadFont(font));
        return fonts;
    } catch (error) {
        console.error('Error loading fonts:', error);
        return [];
    }
};

export default {
    getFonts,
    generateFontFaceCSS,
    loadFont,
    loadFontFamily,
    loadAllFonts,
};
