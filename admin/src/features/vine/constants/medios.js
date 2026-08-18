const MEDIO_HUELLA = 'Solo Huella';
const MEDIO_TARJETA = 'Solo Tarjeta';
const MEDIO_SUPERUSUARIO = 'Superusuario';

export const MEDIOS = {
    [MEDIO_HUELLA]: { etiqueta: 'huella', color: 'blue', confiable: true },
    [MEDIO_SUPERUSUARIO]: { etiqueta: 'superusuario', color: 'purple', confiable: true },
    [MEDIO_TARJETA]: { etiqueta: 'tarjeta', color: 'default', confiable: false },
};

export const medioInfo = (medio) => MEDIOS[medio] ?? { etiqueta: medio, color: 'default', confiable: false };
