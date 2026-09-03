const aPx = (valor) => {
    const texto = String(valor ?? '').trim();
    if (texto.endsWith('rem')) return Math.round(parseFloat(texto) * 16);
    if (texto.endsWith('px')) return Math.round(parseFloat(texto));
    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : null;
};

export const PADRE = {
    titulo: 'lienzo',
    subrayado: 'lienzo',
    bajada: 'lienzo',
    aviso: 'lienzo',
    filaBotones: 'lienzo',
    tags: 'lienzo',
    tarjetas: 'lienzo',
    grafica: 'lienzo',
    tabla: 'lienzo',
    botonPrimario: 'filaBotones',
    botonAcento: 'filaBotones',
    enlace: 'filaBotones',
    tagAprobada: 'tags',
    tagPendiente: 'tags',
    tagRechazada: 'tags',
    tagRevision: 'tags',
    campo: 'tarjetas',
    tarjetaSombra: 'tarjetas',
    cifra: 'campo',
    barraCifra: 'campo',
    nota: 'campo',
    subtitulo: 'grafica',
    barras: 'grafica',
    encabezadoTabla: 'tabla',
    filasTabla: 'tabla',
};

const ancestros = (elemento) => {
    const cadena = [];
    let actual = PADRE[elemento];
    while (actual) {
        cadena.push(actual);
        actual = PADRE[actual];
    }
    return cadena;
};

const esAncestro = (posible, elemento) => ancestros(elemento).includes(posible);

export const esVivo = (elemento, lista) => {
    if (!lista || lista.length === 0) return true;
    if (lista.includes(elemento)) return true;
    if (ancestros(elemento).some((padre) => lista.includes(padre))) return true;
    return lista.some((vivo) => esAncestro(elemento, vivo));
};

const POR_COLOR = {
    'color.primary': ['titulo', 'botonPrimario', 'barraCifra'],
    'color.primary-deep': ['botonPrimario', 'barraCifra'],
    'color.secondary': ['subtitulo', 'enlace', 'encabezadoTabla'],
    'color.accent': ['botonAcento', 'subrayado'],
    'color.accent-deep': ['botonAcento', 'subrayado'],
    'color.accent-soft': ['aviso'],
    'color.text': ['bajada', 'filasTabla', 'nota', 'cifra'],
    'color.bg': ['fondo'],
    'color.surface-field': ['campo'],
    'color.success': ['tagAprobada'],
    'color.success-soft': ['tagAprobada'],
    'color.warning': ['tagPendiente'],
    'color.warning-soft': ['tagPendiente'],
    'color.danger': ['tagRechazada'],
    'color.danger-soft': ['tagRechazada'],
    'color.info': ['tagRevision'],
    'color.info-soft': ['tagRevision'],
};

const POR_TAMANO = {
    '2xl': ['titulo'],
    xl: ['titulo'],
    lg: ['subtitulo', 'cifra'],
    base: ['bajada', 'botonPrimario', 'botonAcento'],
    sm: ['filasTabla', 'encabezadoTabla', 'enlace'],
    xs: ['nota'],
};

const vacio = { elementos: [], demo: null, nota: '' };

export const aplicacionDe = (clave, valor) => {
    const nombre = String(clave || '');

    if (POR_COLOR[nombre]) {
        return { elementos: POR_COLOR[nombre], demo: null, nota: '' };
    }

    if (nombre.startsWith('dataviz.') || nombre.includes('viz')) {
        return { elementos: ['barras'], demo: null, nota: 'Las barras salen de la paleta de datos.' };
    }

    if (nombre.startsWith('font.family.')) {
        const esDisplay = nombre.endsWith('display') || nombre.endsWith('titles');
        return {
            elementos: esDisplay ? ['titulo', 'subtitulo'] : ['bajada', 'filasTabla', 'nota'],
            demo: null,
            nota: '',
        };
    }

    if (nombre.startsWith('font.size.')) {
        const escalon = nombre.split('.').pop();
        return { elementos: POR_TAMANO[escalon] || ['bajada'], demo: null, nota: '' };
    }

    if (nombre.startsWith('font.weight.')) {
        return { elementos: ['titulo', 'cifra'], demo: null, nota: '' };
    }

    if (nombre.startsWith('leading.')) {
        return { elementos: ['bajada'], demo: null, nota: 'La altura de línea del párrafo.' };
    }

    if (nombre.startsWith('space.')) {
        const px = aPx(valor);
        return {
            elementos: ['filaBotones'],
            demo: px === null ? null : { tipo: 'espacio', valor: px },
            nota: px === null ? '' : `La separación entre los botones vale ${px} px con este token.`,
        };
    }

    if (nombre.startsWith('radius.')) {
        const px = aPx(valor);
        return {
            elementos: ['botonPrimario', 'botonAcento', 'tarjetas'],
            demo: px === null ? null : { tipo: 'radio', valor: Math.min(px, 40) },
            nota: px === null ? '' : `Las esquinas de botones y tarjetas se redondean ${Math.min(px, 40)} px.`,
        };
    }

    if (nombre.startsWith('shadow.')) {
        return {
            elementos: ['tarjetaSombra'],
            demo: { tipo: 'sombra', valor: String(valor) },
            nota: 'Se le aplica a una tarjeta que normalmente no lleva sombra, para que se note.',
        };
    }

    if (nombre.startsWith('breakpoint.')) {
        const px = aPx(valor);
        return {
            elementos: [],
            demo: px === null ? null : { tipo: 'ancho', valor: px },
            nota: px === null ? '' : `La pieza se encoge a ${px} px para enseñar cómo responde.`,
        };
    }

    return vacio;
};

export const estiloApagado = (elemento, aplicacion, activo) => {
    if (!activo || !aplicacion || aplicacion.elementos.length === 0) return {};
    return {
        opacity: esVivo(elemento, aplicacion.elementos) ? 1 : 0.14,
        transition: 'opacity 0.2s ease',
    };
};
