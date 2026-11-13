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

const MOTIVOS_SESION = {
    reutilizado: 'Se usó un refresh token ya rotado: dos renovaciones compitieron (pestañas, red lenta) y por seguridad se revocó la sesión.',
    expirado: 'El refresh token ya no existía: la sesión venció o se cerró en otro lado.',
    sin_cookie: 'El navegador no mandó la cookie de refresco.',
    sin_usuario: 'El usuario del token ya no existe en mariachi.',
    error: 'Redis no respondió al renovar.',
};

const porMinuto = (grupo) => {
    const minutos = Math.max(1, grupo.duracion_s / 60);
    return Math.round(grupo.golpes / minutos);
};

export default function DetalleGrupo({ grupo }) {
    if (grupo.tipo === 'sesion') {
        const items = [
            { key: 'motivo', label: 'Motivo', children: MOTIVOS_SESION[grupo.scope] || grupo.scope },
            { key: 'veces', label: 'Veces que lo sacó', children: grupo.golpes },
            { key: 'lapso', label: 'Lapso', children: `${hora(grupo.primero)} – ${hora(grupo.ultimo)}` },
        ];
        return (
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                <SerieGolpes serie={grupo.serie} />
                <Descriptions size="small" column={1} items={items} />
            </Space>
        );
    }
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
