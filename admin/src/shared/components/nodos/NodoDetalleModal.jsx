import { Badge, Empty, Grid, Modal, Progress, Space, Tag, Typography } from 'antd';
import { SEMANTIC } from '@app/providers/brand';
import { aPlataforma } from '@shared/services/catalogoServicios';
import { NODO_INTERNET } from '@shared/services/nodosService';
import FilaServicio, { ANCHO_ENLACES } from '@shared/components/nodos/FilaServicio';

const { Text } = Typography;

const UMBRAL = { cpu: 90, ram: 80, swap: 10, disco: 85 };

const ESTADO_BADGE = {
    ok: { status: 'success', texto: 'operativo' },
    degraded: { status: 'warning', texto: 'degradado' },
    down: { status: 'error', texto: 'caído' },
};

const { useBreakpoint } = Grid;

const COLUMNAS_SERVICIO = `196px 1fr 50px ${ANCHO_ENLACES}px`;

const tono = (llave, valor) => {
    if (valor == null) return SEMANTIC.neutral;
    if (valor >= UMBRAL[llave]) return SEMANTIC.danger;
    if (valor >= UMBRAL[llave] * 0.75) return SEMANTIC.warning;
    return SEMANTIC.success;
};

const TituloSeccion = ({ texto, conteo }) => (
    <Space size={8} align="center" style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {texto}
        </Text>
        {conteo && (
            <Text style={{
                fontSize: 11,
                fontFamily: 'monospace',
                padding: '0 7px',
                borderRadius: 9,
                background: '#f5f5f5',
                color: 'rgba(0,0,0,0.65)',
            }}>
                {conteo}
            </Text>
        )}
    </Space>
);

const ESCALA_TEMPERATURA = [
    { hasta: 45, color: SEMANTIC.info, texto: 'fría' },
    { hasta: 70, color: SEMANTIC.success, texto: 'templada' },
    { hasta: 85, color: SEMANTIC.warning, texto: 'caliente' },
];

const TEMPERATURA_TOPE = 100;

const gradoDe = (grados) => ESCALA_TEMPERATURA.find((t) => grados < t.hasta)
    || { color: SEMANTIC.danger, texto: 'muy caliente' };

const CifraTemperatura = ({ nombre, grados }) => {
    const tramo = gradoDe(grados);
    return (
        <div style={{ minWidth: 88 }}>
            <Text style={{
                display: 'block',
                fontSize: 26,
                fontWeight: 600,
                lineHeight: 1.1,
                color: tramo.color,
                fontVariantNumeric: 'tabular-nums',
            }}>
                {`${grados}°`}
            </Text>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {nombre}
            </Text>
            <Text style={{ display: 'block', fontSize: 10, color: tramo.color }}>
                {tramo.texto}
            </Text>
        </div>
    );
};

const Medidor = ({ llave, etiqueta, valor, absoluto }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 116px', gap: 8, alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>{etiqueta}</Text>
        <Progress
            percent={valor ?? 0}
            showInfo={false}
            size="small"
            strokeColor={tono(llave, valor)}
            railColor="#f5f5f5"
        />
        <Text type="secondary" style={{ fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {absoluto}
        </Text>
    </div>
);

const desdeHace = (segundos) => {
    if (segundos == null) return '—';
    const dias = Math.floor(segundos / 86400);
    return dias >= 1 ? `${dias} d` : `${Math.floor(segundos / 3600)} h`;
};

const discoLibre = (host) => {
    if (host.disk_free_gb == null) return '—';
    if (host.disk_used_percent == null) return `${host.disk_free_gb} GB libres`;
    const total = host.disk_free_gb / (1 - host.disk_used_percent / 100);
    return `${Math.round(total - host.disk_free_gb)} / ${Math.round(total)} GB`;
};

export default function NodoDetalleModal({ nodo, open, onClose }) {
    const pantalla = useBreakpoint();
    const compacto = !pantalla.md;

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
                <Space size={10} wrap style={{ paddingRight: 30 }}>
                    {!esInternet && <Badge status={badge.status} />}
                    <Text strong style={{ fontFamily: 'monospace', fontSize: 18 }}>
                        {esInternet ? 'Internet' : nodo.node}
                    </Text>
                </Space>
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
                                valor={cargaPorNucleo != null ? Math.min(100, Math.round(cargaPorNucleo * 100)) : null}
                                absoluto={host.load_1m != null ? `${host.load_1m} · ${host.cores}c` : '—'}
                            />
                            <Medidor
                                llave="ram"
                                etiqueta="RAM"
                                valor={host.memory_used_percent}
                                absoluto={host.memory_used_gb != null ? `${host.memory_used_gb} / ${host.memory_total_gb} GB` : '—'}
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
                            {sistema && (
                                <Text style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(0,0,0,0.65)' }}>
                                    {sistema}
                                </Text>
                            )}
                        </Space>
                    </div>
                )}

                {temperaturas.length > 0 && (
                    <div>
                        <TituloSeccion texto="Temperaturas" conteo={`${temperaturas.length}`} />
                        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                            {temperaturas.map((sensor) => (
                                <CifraTemperatura
                                    key={sensor.nombre}
                                    nombre={sensor.nombre}
                                    grados={sensor.celsius}
                                />
                            ))}
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
