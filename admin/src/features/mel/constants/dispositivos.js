export const DISPOSITIVOS = [
    { id: 'sm', nombre: 'Mobile', ancho: 640, enModal: false },
    { id: 'md', nombre: 'Tablet', ancho: 768, enModal: false },
    { id: 'lg', nombre: 'Laptop', ancho: 1024, enModal: true },
    { id: 'xl', nombre: 'Desktop', ancho: 1280, enModal: true },
];

export const POR_DEFECTO = 'md';

export const dispositivoDe = (id) => DISPOSITIVOS.find((d) => d.id === id) || null;

export const anchoDe = (id) => {
    const encontrado = dispositivoDe(id);
    return encontrado ? encontrado.ancho : null;
};

export const vaEnModal = (id) => {
    const encontrado = dispositivoDe(id);
    return Boolean(encontrado && encontrado.enModal);
};
