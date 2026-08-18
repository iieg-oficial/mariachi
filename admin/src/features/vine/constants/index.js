export const COLOR_ENTRADA = '#3B5BA9';
export const COLOR_SALIDA = '#FF8300';
export const COLOR_NEUTRO = '#3B5BA9';

export const RANGOS = [
    { value: 7, label: '7 días' },
    { value: 30, label: '30 días' },
    { value: 90, label: '90 días' },
    { value: 365, label: '1 año' },
];

export const EJE_TEXTO = { fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' };

export const COLOR_SIN_LECTOR = '#8C8C8C';

export const COLOR_VINCULO = {
    Plantilla: 'blue',
    'Prácticas profesionales': 'purple',
    'Servicio social': 'cyan',
    Limpieza: 'gold',
    'Asimilados a salarios': 'geekblue',
    'Empleo temporal': 'orange',
    Delfín: 'magenta',
    Baja: 'red',
    'Sin asignar': 'default',
};

export const PUERTAS = [
    {
        id: 'principal',
        nombre: 'Puerta principal',
        lectores: [{ punto: 'IIEG 1', sentido: 'salida' }, { punto: 'IIEG-2', sentido: 'entrada' }],
    },
    {
        id: 'secundaria',
        nombre: 'Puerta secundaria',
        lectores: [{ punto: 'IIEG-3', sentido: 'salida' }, { punto: 'IIEG-4', sentido: 'entrada' }],
    },
];

export const PUERTA_ACCESIBLE = {
    id: 'accesible',
    nombre: 'Puerta accesible',
    nota: 'Una sola hoja abatible hacia afuera, con bisagras en el tubo. Tiene lector propio —de acercamiento o clave numérica— pero no está conectado al biométrico: nada de lo que pasa por aquí queda registrado.',
};

export const PUNTOS_RETIRADOS = ['IIEG-1', 'BOTON DE SALIDA'];

