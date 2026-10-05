import { BRAND } from '@app/providers/brand';

export const ANIMACIONES = [
    { value: 'pelota', label: 'Pelota', descripcion: 'Cae rebotando hasta el fondo del mapa.' },
    { value: 'aguilas', label: 'Águilas', descripcion: 'Una parvada cruza el mapa y suelta el dato.' },
];

export const MODOS_EVENTO = [
    { value: 'completo', label: 'Completo' },
    { value: 'lite', label: 'Lite' },
];

export const FONDOS_PALETA = [
    { value: 'blanco', label: 'Blanco', color: '#FFFFFF' },
    { value: 'morado-suave', label: 'Morado suave', color: '#F0E6F6' },
    { value: 'morado', label: 'Morado', color: BRAND.purple },
    { value: 'naranja', label: 'Naranja', color: BRAND.orange },
    { value: 'grafito', label: 'Grafito', color: '#465055' },
];

export const FORMAS_TRAMOS = [
    { value: 'ninguno', label: 'Sin', tramos: 0 },
    { value: 'solido', label: 'Sólido', tramos: 1 },
    { value: 'mitades', label: 'Mitades', tramos: 2 },
    { value: 'tercios', label: 'Tercios', tramos: 3 },
];

export const FONDO_PRESETS = [
    { value: 'blanco', label: 'Blanco', forma: 'solido', colores: ['blanco'] },
    { value: 'naranja', label: 'Naranja', forma: 'solido', colores: ['naranja'] },
    { value: 'morado', label: 'Morado', forma: 'solido', colores: ['morado'] },
    { value: 'iieg', label: 'IIEG', forma: 'mitades', colores: ['morado', 'naranja'] },
];

export const BORDE_PRESETS = [
    { value: 'mexico', label: 'México', forma: 'tercios', colores: ['#006847', '#FFFFFF', '#CE1126'] },
    { value: 'iieg', label: 'IIEG', forma: 'mitades', colores: [BRAND.purple, BRAND.orange] },
    { value: 'naranja', label: 'Naranja', forma: 'solido', colores: [BRAND.orange] },
    { value: 'morado', label: 'Morado', forma: 'solido', colores: [BRAND.purple] },
];

export const tramosDeForma = (forma) => FORMAS_TRAMOS.find((f) => f.value === forma)?.tramos ?? 0;

export const DESTINO_ZOOM = { min: 5, max: 19, porDefecto: 15 };

export const DESTINO_RUTA_MAX = 4;
