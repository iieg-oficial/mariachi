export const SECCIONES = [
    {
        titulo: 'Principios de marca',
        campos: [
            ['brand.personality', 'Personalidad'],
            ['brand.transmit', 'Debe transmitir'],
            ['brand.avoid', 'Evitar'],
        ],
    },
    {
        titulo: 'Logotipo',
        campos: [
            ['logo.largo.claro', 'Largo, fondo claro'],
            ['logo.largo.oscuro', 'Largo, fondo oscuro'],
            ['logo.corto.claro', 'Corto, fondo claro'],
            ['logo.corto.oscuro', 'Corto, fondo oscuro'],
            ['logo.clearspace.factor', 'Factor del área de protección'],
            ['logo.clearspace', 'Área de protección'],
            ['logo.minsize.screen', 'Tamaño mínimo en pantalla'],
            ['logo.minsize.print', 'Tamaño mínimo impreso'],
        ],
    },
    {
        titulo: 'Tipografía',
        campos: [
            ['type.titles.font', 'Fuente de títulos'],
            ['type.titles.weights', 'Pesos de títulos'],
            ['type.body.font', 'Fuente de cuerpo'],
            ['type.body.weights', 'Pesos de cuerpo'],
            ['type.data.font', 'Fuente de datos y cifras'],
            ['type.data.weights', 'Pesos de datos y cifras'],
        ],
    },
    {
        titulo: 'Espaciado y rejilla',
        campos: [
            ['space.base', 'Unidad base de espaciado'],
            ['grid.cols', 'Columnas'],
            ['grid.gutter', 'Canaleta'],
            ['grid.maxwidth', 'Ancho máximo de contenido'],
        ],
    },
    {
        titulo: 'Componentes',
        campos: [
            ['comp.buttons.rules', 'Botones'],
            ['comp.links.underline', 'Subrayado de enlaces'],
            ['comp.forms.touch', 'Área táctil mínima'],
            ['comp.cards.padding', 'Padding de tarjetas'],
            ['comp.nav.rules', 'Navegación'],
        ],
    },
    {
        titulo: 'Iconografía y datos',
        campos: [
            ['icon.set', 'Set de iconos'],
            ['icon.photo', 'Estilo de fotografía'],
            ['color.accent.max', 'Máximo de acentos por vista'],
            ['data.categorical.max', 'Máximo de categorías'],
            ['map.projection', 'Proyección de mapas'],
        ],
    },
    {
        titulo: 'Redacción y referencias',
        campos: [
            ['copy.tone', 'Tono'],
            ['copy.dates', 'Formato de fechas'],
            ['copy.caps', 'Mayúsculas'],
            ['ref.manual', 'Manual de identidad'],
            ['ref.assets', 'Archivos de marca'],
            ['ref.site', 'Sitio de referencia'],
        ],
    },
];

export const CAMPOS_LARGOS = new Set([
    'brand.personality',
    'brand.transmit',
    'brand.avoid',
    'comp.buttons.rules',
    'comp.nav.rules',
]);
