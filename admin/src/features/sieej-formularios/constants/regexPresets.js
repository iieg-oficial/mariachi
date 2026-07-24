export const REGEX_PRESETS = [
    {
        value: 'curp',
        label: 'CURP',
        pattern: '^[A-Z]{4}\\d{6}[HM][A-Z]{5}[A-Z0-9]\\d$',
        message: 'Ingresa una CURP válida de 18 caracteres',
    },
    {
        value: 'rfc',
        label: 'RFC (con homoclave)',
        pattern: '^[A-ZÑ&]{3,4}\\d{6}[A-Z0-9]{3}$',
        message: 'Ingresa un RFC válido',
    },
    {
        value: 'codigo_postal',
        label: 'Código postal (5 dígitos)',
        pattern: '^\\d{5}$',
        message: 'Ingresa un código postal de 5 dígitos',
    },
    {
        value: 'telefono',
        label: 'Teléfono (10 dígitos)',
        pattern: '^\\d{10}$',
        message: 'Ingresa un teléfono de 10 dígitos',
    },
    {
        value: 'email',
        label: 'Correo electrónico',
        pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
        message: 'Ingresa un correo electrónico válido',
    },
    {
        value: 'clabe',
        label: 'CLABE interbancaria (18 dígitos)',
        pattern: '^\\d{18}$',
        message: 'Ingresa una CLABE de 18 dígitos',
    },
    {
        value: 'solo_numeros',
        label: 'Solo números',
        pattern: '^\\d+$',
        message: 'Ingresa solo números',
    },
    {
        value: 'solo_letras',
        label: 'Solo letras',
        pattern: '^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+$',
        message: 'Ingresa solo letras',
    },
    {
        value: 'solo_letras_espacios',
        label: 'Solo letras y espacios',
        pattern: '^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ ]+$',
        message: 'Ingresa solo letras y espacios',
    },
    {
        value: 'url',
        label: 'URL (http/https)',
        pattern: '^https?://[^\\s]+$',
        message: 'Ingresa una URL que comience con http:// o https://',
    },
];

