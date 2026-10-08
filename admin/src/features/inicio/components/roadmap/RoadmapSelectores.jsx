import { memo, useMemo } from 'react';
import { Empty, Input, Space, Tag, Typography } from 'antd';
import { COLOR_PROYECTO } from '@features/inicio/constants/roadmapModelo';
import { LOGO_PROYECTO } from '@features/inicio/constants/roadmapLogos';
import { TIPOS_HITO } from '@features/inicio/constants/roadmapTipos';
import RoadmapPrevia from '@features/inicio/components/roadmap/RoadmapPrevia';

const { Text } = Typography;

const rejilla = (minimo) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minimo}px, 1fr))`,
    gap: 6,
});

const cajaBase = (activo) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '5px 8px',
    borderRadius: 6,
    border: `1px solid ${activo ? '#5C2472' : '#e6e6e6'}`,
    background: activo ? '#F6EDFA' : '#fff',
    cursor: 'pointer',
    font: 'inherit',
    fontSize: 12,
    fontWeight: activo ? 600 : 400,
    color: 'rgba(0,0,0,0.75)',
    textAlign: 'left',
    width: '100%',
});

export const SelectorProyecto = memo(function SelectorProyecto({ value, onChange }) {
    return (
        <div style={{ ...rejilla(122), maxHeight: 132, overflowY: 'auto', padding: 2 }}>
            {Object.keys(COLOR_PROYECTO).map((clave) => (
                <button
                    key={clave}
                    type="button"
                    aria-pressed={value === clave}
                    style={cajaBase(value === clave)}
                    onClick={() => onChange(clave)}
                >
                    <span style={{ width: 11, height: 11, borderRadius: 3, flex: 'none', background: COLOR_PROYECTO[clave] }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {clave}
                    </span>
                    {LOGO_PROYECTO[clave] && (
                        <img src={LOGO_PROYECTO[clave]} alt="" width={13} height={13} style={{ flex: 'none' }} />
                    )}
                </button>
            ))}
        </div>
    );
});

export const SelectorTipo = memo(function SelectorTipo({ value, proyecto, onChange }) {
    const elegido = TIPOS_HITO.find((t) => t.valor === value);

    return (
        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
            <div style={rejilla(112)}>
                {TIPOS_HITO.map((tipo) => (
                    <button
                        key={tipo.valor}
                        type="button"
                        aria-pressed={value === tipo.valor}
                        title={tipo.ayuda}
                        style={{
                            ...cajaBase(value === tipo.valor),
                            flexDirection: 'column',
                            gap: 4,
                            padding: '8px 5px 6px',
                            textAlign: 'center',
                        }}
                        onClick={() => onChange(tipo.valor)}
                    >
                        <RoadmapPrevia
                            item={{ txt: proyecto || 'ejemplo', proy: proyecto, tipo: tipo.valor }}
                            tipo="hitos"
                            compacto
                        />
                        <span style={{ fontSize: 11 }}>{tipo.nombre}</span>
                    </button>
                ))}
            </div>
            {elegido && <Text type="secondary" style={{ fontSize: 11 }}>{elegido.ayuda}</Text>}
        </Space>
    );
});

export const SelectorConexion = memo(function SelectorConexion({
    value, hitos, actual, busqueda, onBuscar, onChange,
}) {
    const candidatos = useMemo(() => hitos
        .filter((h) => h.id !== actual)
        .filter((h) => !busqueda || h.txt.toLowerCase().includes(busqueda.toLowerCase()))
        .sort((a, b) => a.f.localeCompare(b.f)), [hitos, actual, busqueda]);

    return (
        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
            <Input
                size="small"
                allowClear
                placeholder="Buscar entre los demás hitos"
                value={busqueda}
                onChange={(e) => onBuscar(e.target.value)}
            />
            <div style={{ maxHeight: 148, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: 2 }}>
                <button type="button" aria-pressed={!value} style={cajaBase(!value)} onClick={() => onChange(null)}>
                    <span style={{ color: 'rgba(0,0,0,0.45)' }}>Sin conexión</span>
                </button>
                {candidatos.length === 0 && (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Ninguno coincide" style={{ margin: '8px 0' }} />
                )}
                {candidatos.map((h) => (
                    <button
                        key={h.id}
                        type="button"
                        aria-pressed={value === h.id}
                        style={cajaBase(value === h.id)}
                        onClick={() => onChange(h.id)}
                    >
                        <span style={{ width: 11, height: 11, borderRadius: 3, flex: 'none', background: COLOR_PROYECTO[h.proy] || COLOR_PROYECTO.infra }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {h.txt}
                        </span>
                        <Tag style={{ marginInlineEnd: 0, fontSize: 10 }}>{h.fecha}</Tag>
                    </button>
                ))}
            </div>
        </Space>
    );
});
