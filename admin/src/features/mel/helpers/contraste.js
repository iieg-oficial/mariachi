const AA_NORMAL = 4.5;
const AA_GRANDE = 3;

const SUFIJOS_SUPERFICIE = ['-soft', '.soft'];
const CLAVES_SUPERFICIE = ['color.bg', 'color.background'];

const canal = (valor) => {
    const c = valor / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export const esHex = (valor) => typeof valor === 'string' && /^#[0-9a-f]{6}$/i.test(valor.trim());

export const esSuperficie = (clave) => {
    const nombre = String(clave || '');
    if (CLAVES_SUPERFICIE.includes(nombre)) return true;
    if (nombre.includes('surface')) return true;
    return SUFIJOS_SUPERFICIE.some((sufijo) => nombre.endsWith(sufijo));
};

export const luminancia = (hex) => {
    const n = parseInt(hex.trim().slice(1), 16);
    const r = canal((n >> 16) & 255);
    const g = canal((n >> 8) & 255);
    const b = canal(n & 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const ratioContraste = (frente, fondo) => {
    if (!esHex(frente) || !esHex(fondo)) return null;
    const a = luminancia(frente);
    const b = luminancia(fondo);
    const claro = Math.max(a, b);
    const oscuro = Math.min(a, b);
    return Math.round(((claro + 0.05) / (oscuro + 0.05)) * 10) / 10;
};

export const veredicto = (ratio) => {
    if (ratio === null) return { nivel: 'na', etiqueta: '—' };
    if (ratio >= AA_NORMAL) return { nivel: 'aa', etiqueta: `${ratio}:1` };
    if (ratio >= AA_GRANDE) return { nivel: 'grande', etiqueta: `${ratio}:1` };
    return { nivel: 'falla', etiqueta: `${ratio}:1` };
};

export const evaluarToken = (clave, valor, fondo, colorTexto) => {
    if (!esHex(valor)) return { ...veredicto(null), contra: '' };
    if (esSuperficie(clave)) {
        const ratio = ratioContraste(colorTexto, valor);
        return { ...veredicto(ratio), contra: 'texto encima' };
    }
    return { ...veredicto(ratioContraste(valor, fondo)), contra: 'sobre el fondo' };
};

export const COLORES_VEREDICTO = {
    aa: { fondo: '#E3F1E9', texto: '#1F7A4D' },
    grande: { fondo: '#FFE9CC', texto: '#9E5200' },
    falla: { fondo: '#FBE4E2', texto: '#B3261E' },
    na: { fondo: 'transparent', texto: 'rgba(0,0,0,0.25)' },
};

export const explicaVeredicto = (nivel, contra) => {
    const encima = contra === 'texto encima';
    switch (nivel) {
    case 'aa':
        return encima
            ? 'El texto de cuerpo se lee bien encima de esta superficie.'
            : 'Cumple AA para texto normal sobre el fondo de la marca.';
    case 'grande':
        return encima
            ? 'Solo sirve para texto grande encima. El cuerpo no se lee.'
            : 'Solo alcanza AA para texto grande. No sirve para cuerpo de texto.';
    case 'falla':
        return encima
            ? 'El texto de cuerpo no se lee encima de esta superficie.'
            : 'No alcanza AA. Sirve de fondo o acento, no de color de texto.';
    default:
        return 'Sin color con que comparar.';
    }
};

export const aclarar = (hex, fraccion) => {
    if (!esHex(hex)) return hex;
    const n = parseInt(hex.trim().slice(1), 16);
    const mezcla = (c) => Math.round(c + (255 - c) * fraccion);
    const r = mezcla((n >> 16) & 255);
    const g = mezcla((n >> 8) & 255);
    const b = mezcla(n & 255);
    return `rgb(${r}, ${g}, ${b})`;
};
