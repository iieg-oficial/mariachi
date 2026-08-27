import { Descriptions, Empty, Modal, Progress, Space, Tag, Typography } from 'antd';
import { SEMANTIC } from '@app/providers/brand';

const { Text } = Typography;

const UMBRAL = { cpu: 90, ram: 80, swap: 10, disco: 85 };

const ESTADO_TAG = {
    ok: { color: 'green', texto: 'operativo' },
    degraded: { color: 'gold', texto: 'degradado' },
    down: { color: 'red', texto: 'caído' },
};

const tono = (llave, valor) => {
    if (valor == null) return SEMANTIC.neutral;
    if (valor >= UMBRAL[llave]) return SEMANTIC.danger;
    if (valor >= UMBRAL[llave] * 0.75) return SEMANTIC.warning;
    return SEMANTIC.success;
};

const Medidor = ({ llave, etiqueta, valor, absoluto }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 96px', gap: 8, alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>{etiqueta}</Text>
        <Progress
            percent={valor ?? 0}
            showInfo={false}
            size="small"
            strokeColor={tono(llave, valor)}
            trailColor="#f5f5f5"
        />
        <Text type="secondary" style={{ fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {absoluto}
        </Text>
    </div>
);

const horas = (segundos) => {
    if (segundos == null) return '—';
    const dias = Math.floor(segundos / 86400);
    if (dias >= 1) return `${dias} d`;
    return `${Math.floor(segundos / 3600)} h`;
};

export default function NodoDetalleModal({ nodo, aristas, open, onClose }) {
    if (!nodo) return null;

    const host = nodo.host || {};
    const servicios = nodo.servicios || [];
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
            width={760}
            title={(
                <Space size={10} wrap>
                    <Text strong style={{ fontFamily: 'monospace', fontSize: 18 }}>{nodo.node}</Text>
                    <Tag color={tag.color}>{tag.texto}</Tag>
                    <Text type="secondary" style={{ fontSize: 13 }}>{nodo.rol}</Text>
                </Space>
            )}
        >
            {Object.keys(host).length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={(
                        <Space orientation="vertical" size={4}>
                            <Text>Este nodo no tiene reportero de host</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Falta <Text code>ONTOY_NODE_REPORTER=true</Text> en uno de sus sidecars.
                            </Text>
                        </Space>
                    )}
                />
            ) : (
                <Space orientation="vertical" size={16} style={{ width: '100%' }}>
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
                    </Space>

                    <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
                        <Descriptions.Item label="Carga 1 / 5 / 15">
                            {host.load_1m != null ? `${host.load_1m} / ${host.load_5m} / ${host.load_15m}` : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Por núcleo">{cargaPorNucleo ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Encendido">hace {horas(host.uptime_seconds)}</Descriptions.Item>
                        <Descriptions.Item label="Contenedores">
                            {`${nodo.containers?.running ?? 0} / ${nodo.containers?.total ?? 0}`}
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
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {servicios.map((s) => (
                                <div key={s.slug} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                    <span style={{
                                        width: 6, height: 6, borderRadius: '50%', flex: 'none',
                                        background: tono('cpu', s.status === 'ok' ? 0 : 100),
                                    }} />
                                    <Text>{s.label || s.slug}</Text>
                                    <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'monospace' }}>
                                        {s.version ? `v${s.version}` : 'sin versión'}
                                        {s.uptime_24h != null ? ` · ${s.uptime_24h}%` : ''}
                                    </Text>
                                </div>
                            ))}
                        </div>
                    </div>
                </Space>
            )}
        </Modal>
    );
}
