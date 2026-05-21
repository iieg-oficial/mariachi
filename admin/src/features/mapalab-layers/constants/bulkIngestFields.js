export const TARGET_FIELDS = [
    { value: 'layer_key', label: 'layer_key (PK obligatorio)' },
    { value: 'workspace', label: 'workspace' },
    { value: 'layer_name_db', label: 'layer_name_db' },
    { value: 'layer_name_usuario', label: 'layer_name_usuario' },
    { value: 'descripcion', label: 'descripcion' },
    { value: 'frecuencia', label: 'frecuencia' },
    { value: 'fecha_ultima', label: 'fecha_ultima' },
    { value: 'tipo_mapa', label: 'tipo_mapa' },
    { value: 'tipo_mapa_enlace', label: 'tipo_mapa_enlace' },
    { value: 'texto_leyenda', label: 'texto_leyenda' },
    { value: 'tarjeta_punto_poligono', label: 'tarjeta_punto_poligono' },
    { value: 'link_final_capa', label: 'link_final_capa' },
    { value: 'downloadable', label: 'downloadable (bool)' },
    { value: 'fuentes_corto', label: 'fuentes.corto' },
    { value: 'fuentes_largo', label: 'fuentes.largo' },
    { value: 'fuentes_enlace', label: 'fuentes.enlace' },
    { value: 'metodologia_texto', label: 'metodologia.texto' },
    { value: 'metodologia_archivo_enlace', label: 'metodologia.archivo_enlace' },
    { value: 'metadato_txt', label: 'metadato (TXT)' },
    { value: 'metadato_xlsx', label: 'metadato (XLSX)' },
    { value: 'nombre_pie_numeralia', label: 'pie_numeralia' },
    ...Array.from({ length: 8 }, (_, i) => {
        const n = String(i + 1).padStart(2, '0');
        return [
            { value: `numeralia_${n}_nombre`, label: `numeralia ${n} - nombre` },
            { value: `numeralia_${n}_valor`, label: `numeralia ${n} - valor` },
            { value: `numeralia_${n}_simbolo`, label: `numeralia ${n} - símbolo` },
        ];
    }).flat(),
];

export const FIELD_OPTIONS = [{ value: '', label: '— ignorar —' }, ...TARGET_FIELDS];

export const formatBulkValue = (v) => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'object') return JSON.stringify(v, null, 2);
    return String(v);
};
