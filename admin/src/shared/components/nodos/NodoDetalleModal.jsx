import { Descriptions, Empty, Modal, Progress, Space, Tag, Typography } from 'antd';
import { SEMANTIC } from '@app/providers/brand';
import { aPlataforma } from '@shared/services/catalogoServicios';
import FilaServicio, { ANCHO_ENLACES } from '@shared/components/nodos/FilaServicio';

const { Text } = Typography;

const UMBRAL = { cpu: 90, ram: 80, swap: 10, disco: 85 };

const ESTADO_TAG = {
    ok: { color: 'green', texto: 'operativo' },
    degraded: { color: 'gold', texto: 'degradado' },
    down: { color: 'red', texto: 'caído' },
};

const COLUMNAS_SERVICIO = `196px 1fr 50px ${ANCHO_ENLACES}px`;

const tono = (llave, valor) => {
    if (valor == null) return SEMANTIC.neutral;
    if (valor >= UMBRAL[llave]) return SEMANTIC.danger;
    if (valor >= UMBRAL[llave] * 0.75) return SEMANTIC.warning;
    return SEMANTIC.success;
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

export default function NodoDetalleModal({ nodo, aristas, open, onClose }) {
    if (!nodo) return null;

    const host = nodo.host || {};
    const servicios = (nodo.servicios || []).map(aPlataforma);
    const contenedores = nodo.contenedores || [];
    const tag = ESTADO_TAG[nodo.status] || { color: 'default', texto: nodo.status };
    const cargaPorNucleo = host.load_1m != null && host.cores
        ? Number((host.load_1m / host.cores).toFixed(2))
        : null;
    const enlaces = aristas.filter((a) => a.de === nodo.node || a.a === nodo.node);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={860}
            title={(
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingRight: 34 }}>
                    <Text strong style={{ fontFamily: 'monospace', fontSize: 18 }}>{nodo.node}</Text>
                    {nodo.hostname && (
                        <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                            {nodo.hostname}
                        </Text>
                    )}
                    <Text type="secondary" style={{ fontSize: 13 }}>{nodo.rol}</Text>
                    <Tag color={tag.color} style={{ marginLeft: 'auto', marginInlineEnd: 0 }}>
                        {tag.texto}
                    </Tag>
                </div>
            )}
        >
            <Space orientation="vertical" size={20} style={{ width: '100%' }}>
                {Object.keys(host).length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Este nodo no tiene reportero de host"
                    />
                ) : (
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
                    </Space>
                )}

                <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
                    <Descriptions.Item label="Carga 1 / 5 / 15">
                        {host.load_1m != null ? `${host.load_1m} / ${host.load_5m} / ${host.load_15m}` : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Por núcleo">{cargaPorNucleo ?? '—'}</Descriptions.Item>
                    <Descriptions.Item label="Encendido">hace {desdeHace(host.uptime_seconds)}</Descriptions.Item>
                    <Descriptions.Item label="Disco libre">
                        {host.disk_free_gb != null ? `${host.disk_free_gb} GB` : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Enlaces" span={2}>
                        {enlaces.length === 0 ? '—' : enlaces.map((a) => {
                            const otro = a.de === nodo.node ? a.a : a.de;
                            return (
                                <Tag key={otro} color={a.estado === 'ok' ? 'green' : 'red'}>
                                    {`${otro} · ${a.estado === 'ok' ? `${a.ms ?? '—'} ms` : 'sin respuesta'}`}
                                </Tag>
                            );
                        })}
                    </Descriptions.Item>
                </Descriptions>

                <div>
                    <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {`Servicios · ${servicios.length}`}
                    </Text>
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

                {contenedores.length > 0 && (
                    <div>
                        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {`Contenedores · ${nodo.containers?.running ?? 0} de ${nodo.containers?.total ?? 0}`}
                        </Text>
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
