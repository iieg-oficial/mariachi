import api from './api';

export const getFonts = async (family = null) => {
    try {
        const params = new URLSearchParams();
        if (family) params.append('family', family);

        const response = await api.get(`/fonts?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching fonts:', error);
        throw error;
    }
};

export const getFontFamilies = async () => {
    try {
        const response = await api.get('/fonts/families');
        return response.data;
    } catch (error) {
        console.error('Error fetching font families:', error);
        throw error;
    }
};

export const uploadFont = async (file, metadata, onProgress) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', metadata.name);
        formData.append('family', metadata.family);
        formData.append('style', metadata.style || 'normal');
        formData.append('weight', metadata.weight || 400);

        const response = await api.post('/fonts', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress) {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    onProgress(percentCompleted);
                }
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error uploading font:', error);
        throw error;
    }
};

export const updateFont = async (fontId, metadata) => {
    try {
        const formData = new FormData();
        formData.append('name', metadata.name);
        formData.append('family', metadata.family);
        formData.append('style', metadata.style || 'normal');
        formData.append('weight', metadata.weight || 400);

        const response = await api.put(`/fonts/${fontId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    } catch (error) {
        console.error('Error updating font:', error);
        throw error;
    }
};

export const deleteFont = async (fontId) => {
    try {
        await api.delete(`/fonts/${fontId}`);
        return true;
    } catch (error) {
        console.error('Error deleting font:', error);
        throw error;
    }
};

export const validateFontFile = (file) => {
    const allowedTypes = [
        'font/woff2',
        'application/font-woff2',
        'font/woff',
        'application/font-woff',
        'application/x-font-woff',
        'font/ttf',
        'application/x-font-ttf',
        'application/x-font-truetype',
        'font/truetype',
        'font/otf',
        'application/x-font-otf',
        'application/vnd.ms-opentype', 
        'application/font-sfnt',
        'font/sfnt',
        'application/octet-stream',
        'application/vnd.oasis.opendocument.formula-template',
    ];

    const allowedExtensions = ['.woff2', '.woff', '.ttf', '.otf'];

    const hasValidType = allowedTypes.includes(file.type);
    const hasValidExtension = allowedExtensions.some(ext =>
        file.name.toLowerCase().endsWith(ext)
    );

    return hasValidType || hasValidExtension;
};

export const getFontFormat = (file) => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.woff2')) return 'woff2';
    if (name.endsWith('.woff')) return 'woff';
    if (name.endsWith('.ttf')) return 'ttf';
    if (name.endsWith('.otf')) return 'otf';
    return 'unknown';
};

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

export const loadFontFamily = (fonts) => {
    fonts.forEach(font => loadFont(font));
};

export default {
    getFonts,
    getFontFamilies,
    uploadFont,
    updateFont,
    deleteFont,
    validateFontFile,
    getFontFormat,
    formatFileSize,
    generateFontFaceCSS,
    loadFont,
    loadFontFamily,
};
