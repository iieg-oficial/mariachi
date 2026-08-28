import { useEffect, useState } from 'react';
import { Badge, Empty, Grid, Modal, Space, Tag, Typography } from 'antd';
import { SEMANTIC } from '@app/providers/brand';
import FilaServicio, { ANCHO_ENLACES } from '@shared/components/nodos/FilaServicio';
import { CifraTemperatura, Medidor, TituloSeccion } from '@shared/components/nodos/piezasNodo';
import { ESTADO_BADGE, desdeHace, discoLibre } from '@shared/components/nodos/nodoUtils';
import { aPlataforma } from '@shared/services/catalogoServicios';
import { NODO_INTERNET, getHistorialNodo, seriesDeTemperatura } from '@shared/services/nodosService';
import GraficaTemperaturas from '@shared/components/nodos/GraficaTemperaturas';
const { Text } = Typography;
const { useBreakpoint } = Grid;

const COLUMNAS_SERVICIO = `196px 1fr 50px ${ANCHO_ENLACES}px`;

export default function NodoDetalleModal({ nodo, open, onClose }) {
    const pantalla = useBreakpoint();
    const compacto = !pantalla.md;
    const [series, setSeries] = useState([]);
    const [cargandoSeries, setCargandoSeries] = useState(false);

    const clave = open && nodo?.node !== NODO_INTERNET ? nodo?.node : null;

    useEffect(() => {
        if (!clave) {
            setSeries([]);
            return undefined;
        }
        let cancelado = false;
        setCargandoSeries(true);
        getHistorialNodo(clave)
            .then((muestras) => { if (!cancelado) setSeries(seriesDeTemperatura(muestras)); })
            .catch(() => { if (!cancelado) setSeries([]); })
            .finally(() => { if (!cancelado) setCargandoSeries(false); });
        return () => { cancelado = true; };
    }, [clave]);

    if (!nodo) return null;

    const host = nodo.host || {};
    const servicios = (nodo.servicios || []).map(aPlataforma);
    const contenedores = nodo.contenedores || [];
    const puertos = nodo.puertos || [];
    const temperaturas = host.temperaturas || [];
    const badge = ESTADO_BADGE[nodo.status] || { status: 'default', texto: nodo.status };
    const cargaPorNucleo = host.load_1m != null && host.cores
        ? Number((host.load_1m / host.cores).toFixed(2))
        : null;
    const usoCpu = cargaPorNucleo != null ? Math.min(100, Math.round(cargaPorNucleo * 100)) : null;

    const esInternet = nodo.node === NODO_INTERNET;
    const dominio = typeof window !== 'undefined' ? window.location.origin : null;

    const sistema = [
        nodo.hostname,
        host.ip,
        host.os,
        host.kernel && `kernel ${host.kernel}`,
        host.uptime_seconds != null && `encendido hace ${desdeHace(host.uptime_seconds)}`,
    ].filter(Boolean).join(' · ');

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={compacto ? '100%' : 860}
            style={compacto ? { top: 0, maxWidth: '100%', margin: 0, paddingBottom: 0 } : undefined}
            styles={compacto ? { body: { maxHeight: 'calc(100dvh - 110px)', overflowY: 'auto' } } : undefined}
            title={(
                <div style={{ paddingRight: 30, whiteSpace: 'normal' }}>
                    <Space size={10} align="center">
                        {!esInternet && <Badge status={badge.status} />}
                        <Text strong style={{ fontFamily: 'monospace', fontSize: 18 }}>
                            {esInternet ? 'Internet' : nodo.node}
                        </Text>
                    </Space>
                    {sistema && (
                        <div style={{ marginTop: 2 }}>
                            <Text style={{
                                fontSize: 12,
                                fontWeight: 400,
                                fontFamily: 'monospace',
                                color: 'rgba(0,0,0,0.45)',
                            }}>
                                {sistema}
                            </Text>
                        </div>
                    )}
                </div>
            )}
        >
            <Space orientation="vertical" size={20} style={{ width: '100%' }}>
                {esInternet && (
                    <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                        <Text>
                            Todo el tráfico público entra por aquí y lo recibe el nginx de
                            {' '}<Text strong>gateway-hub</Text>, en S1, que lo reparte al resto.
                            Ningún otro nodo está expuesto a Internet.
                        </Text>
                        {dominio && (
                            <Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                {dominio}
                            </Text>
                        )}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            La administración no entra por aquí: va por SSH a cada nodo, y los que no
                            son S1 solo se alcanzan desde la red interna.
                        </Text>
                    </Space>
                )}

                {esInternet ? null : Object.keys(host).length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Este nodo no tiene reportero de host"
                    />
                ) : (
                    <div>
                        <TituloSeccion texto="Recursos" />
                        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                            <Medidor
                                llave="cpu"
                                etiqueta="CPU"
                                valor={usoCpu}
                                absoluto={usoCpu != null ? `${usoCpu} %` : '—'}
                                nota={host.load_1m != null
                                    ? `carga ${host.load_1m} en ${host.cores} núcleos`
                                    : null}
                            />
                            <Medidor
                                llave="ram"
                                etiqueta="RAM"
                                valor={host.memory_used_percent}
                                absoluto={host.memory_used_gb != null
                                    ? `${host.memory_used_gb} / ${host.memory_total_gb} GB`
                                    : '—'}
                                nota={host.memory_cache_gb != null ? `+ ${host.memory_cache_gb} GB en caché` : null}
                            />
                            <Medidor
                                llave="swap"
                                etiqueta="Swap"
                                valor={host.swap_used_percent}
                                absoluto={host.swap_used_gb != null ? `${host.swap_used_gb} GB` : '—'}
                            />
                            <Medidor
                                llave="disco"
                                etiqueta="Disco"
                                valor={host.disk_used_percent}
                                absoluto={discoLibre(host)}
                            />
                        </Space>
                    </div>
                )}

                {temperaturas.length > 0 && (
                    <div>
                        <TituloSeccion texto="Temperaturas" conteo={`${temperaturas.length}`} />
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${Math.min(temperaturas.length, 4)}, 1fr)`,
                            gap: 16,
                        }}>
                            {temperaturas.map((sensor) => (
                                <CifraTemperatura
                                    key={sensor.nombre}
                                    nombre={sensor.nombre}
                                    grados={sensor.celsius}
                                />
                            ))}
                        </div>
                        <div style={{ marginTop: 14 }}>
                            <GraficaTemperaturas series={series} cargando={cargandoSeries} />
                        </div>
                    </div>
                )}

                {puertos.length > 0 && (
                    <div>
                        <TituloSeccion
                            texto="Puertos"
                            conteo={`${puertos.filter((p) => p.status === 'ok').length}/${puertos.length}`}
                        />
                        <div style={{
                            marginTop: 8,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
                            gap: 6,
                        }}>
                            {puertos.map((p) => {
                                const abierto = p.status === 'ok';
                                return (
                                    <div
                                        key={`${p.servicio}-${p.puerto}`}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'baseline',
                                            gap: 8,
                                            padding: '5px 10px',
                                            borderRadius: 6,
                                            background: abierto ? SEMANTIC.successSoft : SEMANTIC.dangerSoft,
                                        }}
                                    >
                                        <Text style={{
                                            fontFamily: 'monospace',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: abierto ? SEMANTIC.success : SEMANTIC.danger,
                                        }}>
                                            {`:${p.puerto}`}
                                        </Text>
                                        <Text style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {p.nombre}
                                        </Text>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {servicios.length > 0 && (
                    <div>
                        <TituloSeccion texto="Servicios" conteo={`${servicios.length}`} />
                        <div style={{ marginTop: 4 }}>
                            {servicios.map((plataforma) => (
                                <FilaServicio
                                    key={plataforma.slug}
                                    plataforma={plataforma}
                                    columnas={COLUMNAS_SERVICIO}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {contenedores.length > 0 && (
                    <div>
                        <TituloSeccion
                            texto="Contenedores"
                            conteo={`${nodo.containers?.running ?? 0}/${nodo.containers?.total ?? 0}`}
                        />
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {contenedores.map((c) => (
                                <Tag
                                    key={c.name}
                                    color={c.state === 'running' ? 'green' : 'default'}
                                    style={{ fontFamily: 'monospace', fontSize: 11 }}
                                >
                                    {c.name}
                                    {c.health === 'unhealthy' ? ' · sin salud' : ''}
                                </Tag>
                            ))}
                        </div>
                    </div>
                )}
            </Space>
        </Modal>
    );
}
