import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Badge, Button, Descriptions, Empty, Modal, Segmented, Space, Tag, Tooltip, Typography, theme } from 'antd';
import TituloConAyuda from '@shared/components/TituloConAyuda';
import { ESTADOS_SYNC } from '../constants/secciones';

const { Text } = Typography;

const BADGE = { ok: 'success', parcial: 'warning', error: 'error' };

const FILTROS = [
    { label: 'Todos', value: 'todos' },
    { label: 'Con error', value: 'error' },
];

const fecha = (iso) => (iso ? new Date(`${iso}Z`).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

const hace = (iso) => {
    if (!iso) return '';
    const minutos = Math.round((Date.now() - new Date(`${iso}Z`).getTime()) / 60000);
    if (minutos < 60) return `hace ${Math.max(minutos, 1)} min`;
    const horas = Math.round(minutos / 60);
    return horas < 48 ? `hace ${horas} h` : `hace ${Math.round(horas / 24)} días`;
};

const segundos = (ms) => `${Math.round((ms ?? 0) / 1000)} s`;

const etiqueta = (estado) => ESTADOS_SYNC[estado]?.etiqueta ?? estado;

function Barras({ ciclos, seleccion, onSeleccionar }) {
    const { token } = theme.useToken();
    const colores = { ok: token.colorSuccess, parcial: token.colorWarning, error: token.colorError };
    const maximo = Math.max(...ciclos.map((c) => c.duracion_ms), 1);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72, padding: '4px 0' }}>
            {ciclos.map((c) => (
                <Tooltip key={c.id} title={`${fecha(c.terminado_en)} · ${etiqueta(c.estado)} · ${segundos(c.duracion_ms)}`}>
                    <button
                        type="button"
                        aria-label={`Ciclo del ${fecha(c.terminado_en)}`}
                        aria-pressed={c.id === seleccion}
                        onClick={() => onSeleccionar(c.id)}
                        style={{
                            flex: '1 1 0',
                            maxWidth: 18,
                            height: `${Math.max(15, (c.duracion_ms / maximo) * 100)}%`,
                            padding: 0,
                            border: 0,
                            borderRadius: 4,
                            cursor: 'pointer',
                            background: colores[c.estado] ?? token.colorTextQuaternary,
                            opacity: c.id === seleccion ? 1 : 0.45,
                            outline: c.id === seleccion ? `2px solid ${token.colorText}` : 'none',
                            outlineOffset: 1,
                        }}
                    />
                </Tooltip>
            ))}
        </div>
    );
}

function Detalle({ ciclo, onAbrir }) {
    const fuentes = Object.entries(ciclo.fuentes || {});
    return (
        <Descriptions size="small" column={1} bordered title={`Ciclo del ${fecha(ciclo.terminado_en)}`}>
            <Descriptions.Item label="Estado">
                <Space size={8}>
                    <Tag color={ESTADOS_SYNC[ciclo.estado]?.color}>{etiqueta(ciclo.estado)}</Tag>
                    <Text type="secondary">{segundos(ciclo.duracion_ms)}</Text>
                </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Fuentes">
                <Space size={4} wrap>
                    {fuentes.length ? fuentes.map(([nombre, f]) => (
                        <Tooltip key={nombre} title={f?.detalle || (f?.estado === 'ok' ? 'Sin novedad' : f?.estado)}>
                            <Tag color={f?.estado === 'ok' ? 'success' : 'warning'}>{nombre}</Tag>
                        </Tooltip>
                    )) : '—'}
                </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Nuevos">
                <Space size={4} wrap>
                    {ciclo.nuevos?.length ? ciclo.nuevos.map((clave) => (
                        <Tag key={clave} color="processing" style={{ cursor: 'pointer' }} onClick={() => onAbrir(clave)}>
                            {clave}
                        </Tag>
                    )) : '—'}
                </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Actualizados">{ciclo.actualizados}</Descriptions.Item>
            <Descriptions.Item label="Errores">
                {ciclo.errores?.length
                    ? ciclo.errores.map((e) => <div key={e}><Text type="danger">{e}</Text></div>)
                    : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Versión"><Text code>{ciclo.version || '—'}</Text></Descriptions.Item>
        </Descriptions>
    );
}

export default function SincronizacionesPanel({ sincronizaciones, loading }) {
    const navigate = useNavigate();
    const [abierto, setAbierto] = useState(false);
    const [filtro, setFiltro] = useState('todos');
    const [seleccion, setSeleccion] = useState(null);
    const ultima = sincronizaciones[0];

    const ciclos = useMemo(() => [...sincronizaciones]
        .reverse()
        .filter((c) => filtro === 'todos' || c.estado !== 'ok'), [sincronizaciones, filtro]);

    const elegido = ciclos.find((c) => c.id === seleccion) ?? ciclos[ciclos.length - 1];

    const abrirPipeline = (clave) => {
        setAbierto(false);
        navigate(`/sieej/documentacion/${clave}`);
    };

    return (
        <>
            <Tooltip title={ultima ? `${etiqueta(ultima.estado)} · ${hace(ultima.terminado_en)}` : 'Aún no hay sincronizaciones'}>
                <Button shape="round" loading={loading} onClick={() => setAbierto(true)}>
                    <Badge status={BADGE[ultima?.estado] ?? 'default'} />
                    Sincronización
                </Button>
            </Tooltip>
            <Modal
                open={abierto}
                onCancel={() => setAbierto(false)}
                footer={null}
                width={720}
                title={(
                    <TituloConAyuda
                        titulo="Sincronización"
                        ayuda="El sincronizador lee la BD del ETL, Airflow y los README de ETL-SIEEJ en cada ciclo, crea los pipelines nuevos y actualiza tablas, vistas y estados de DAG. Nunca pisa una sección editada a mano."
                    />
                )}
            >
                {!ultima ? <Empty description="Aún no hay sincronizaciones" /> : (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Space size={8} wrap>
                            <Badge status={BADGE[ultima.estado] ?? 'default'} text={etiqueta(ultima.estado)} />
                            <Text type="secondary">
                                {hace(ultima.terminado_en)} · {segundos(ultima.duracion_ms)} · {ultima.version || '—'}
                            </Text>
                        </Space>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                            <Text type="secondary">Últimos {sincronizaciones.length} ciclos: alto = duración, color = estado</Text>
                            <Segmented size="small" shape="round" options={FILTROS} value={filtro} onChange={setFiltro} />
                        </Space>
                        {ciclos.length
                            ? <Barras ciclos={ciclos} seleccion={elegido?.id} onSeleccionar={setSeleccion} />
                            : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Ningún ciclo con error" />}
                        {elegido && <Detalle ciclo={elegido} onAbrir={abrirPipeline} />}
                    </Space>
                )}
            </Modal>
        </>
    );
}
