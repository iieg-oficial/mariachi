import { Descriptions, Space } from 'antd';
import SerieGolpes from '@features/incidentes/components/SerieGolpes';
import { duracion, hora, tope } from '@features/incidentes/components/columnas';

const NATURALEZA = {
    GET: 'Lecturas: navegación rápida, polling o un script consultando.',
    POST: 'Escrituras: subidas o altas en lote.',
    PUT: 'Ediciones en lote.',
    PATCH: 'Ediciones en lote.',
    DELETE: 'Borrados en lote.',
};

const porMinuto = (grupo) => {
    const minutos = Math.max(1, grupo.duracion_s / 60);
    return Math.round(grupo.golpes / minutos);
};

export default function DetalleGrupo({ grupo }) {
    const items = [
        { key: 'tope', label: 'Tope', children: tope(grupo.limite, grupo.ventana_s) },
        { key: 'pico', label: 'Contador máximo', children: grupo.pico },
        { key: 'ritmo', label: 'Rechazos por minuto', children: porMinuto(grupo) },
        { key: 'lapso', label: 'Lapso', children: `${hora(grupo.primero)} – ${hora(grupo.ultimo)} (${duracion(grupo.duracion_s)})` },
        { key: 'que', label: 'Qué suele ser', children: NATURALEZA[grupo.metodo] || '—' },
    ];
    return (
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            <SerieGolpes serie={grupo.serie} />
            <Descriptions size="small" column={{ xs: 1, md: 2 }} items={items} />
        </Space>
    );
}
