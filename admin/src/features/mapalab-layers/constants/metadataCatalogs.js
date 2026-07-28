export const TIPO_MAPA_OPTIONS = [
    { value: 'IIEG', label: 'IIEG' },
    { value: 'INEGI', label: 'INEGI' },
];

export const FRECUENCIA_OPTIONS = [
    { value: 'Diaria', label: 'Diaria' },
    { value: 'Semanal', label: 'Semanal' },
    { value: 'Quincenal', label: 'Quincenal' },
    { value: 'Mensual', label: 'Mensual' },
    { value: 'Bimestral', label: 'Bimestral (cada 2 meses)' },
    { value: 'Trimestral', label: 'Trimestral (cada 3 meses)' },
    { value: 'Cuatrimestral', label: 'Cuatrimestral (cada 4 meses)' },
    { value: 'Semestral', label: 'Semestral (cada 6 meses)' },
    { value: 'Anual', label: 'Anual' },
    { value: 'Bianual', label: 'Bianual (cada 2 años)' },
    { value: 'Trienal', label: 'Trienal (cada 3 años)' },
    { value: 'Quinquenal', label: 'Quinquenal (cada 5 años)' },
    { value: 'Decenal', label: 'Decenal (cada 10 años)' },
    { value: 'Continua', label: 'Continua (tiempo real / streaming)' },
    { value: 'Bajo demanda', label: 'Bajo demanda (a petición)' },
    { value: 'No programado', label: 'No programado (irregular)' },
    { value: 'Histórico', label: 'Histórico (sin actualizaciones planeadas)' },
];

export const METADATA_GRID_CATALOGS = {
    frecuencia: FRECUENCIA_OPTIONS,
    tipoMapa: TIPO_MAPA_OPTIONS,
};
