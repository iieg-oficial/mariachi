import { useState } from 'react';
import { Button, Space, Tag, Typography } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { propagacionDelGrupo } from '@features/mapalab-layers/utils/propagacionTarjetita';

const { Text } = Typography;

export default function PropagacionGrupo({ rawTree, groupId, onIrACapa = null }) {
    const [abierto, setAbierto] = useState(false);
    const datos = propagacionDelGrupo(rawTree, groupId);
    if (!datos || datos.total === 0) return null;

    const cuantos = datos.heredan.length;
    const filas = [
        ...datos.heredan.map((p) => ({ ...p, estado: 'hereda' })),
        ...datos.propias.map((p) => ({ ...p, estado: 'propia' })),
        ...datos.sinNada.map((p) => ({ ...p, estado: 'ninguna' })),
    ];

    return (
        <div style={{
            background: '#F6FFED', border: '1px solid #B7EB8F', borderRadius: 6,
            padding: '8px 12px', marginBottom: 12,
        }}>
            <Space size={8} wrap>
                <Text style={{ fontSize: 12 }}>
                    Esta tarjetita la usan <b>{cuantos} de {datos.total}</b> propiedades del grupo.
                </Text>
                <Button
                    size="small"
                    type="link"
                    icon={abierto ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => setAbierto((v) => !v)}
                    style={{ fontSize: 12, padding: 0, height: 18 }}
                >
                    {abierto ? 'Ocultar' : 'Ver cuáles'}
                </Button>
            </Space>

            {abierto && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {filas.map((p) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                            {p.estado === 'hereda' && <Tag color="green" style={{ marginInlineEnd: 0, fontSize: 10 }}>hereda</Tag>}
                            {p.estado === 'propia' && <Tag color="orange" style={{ marginInlineEnd: 0, fontSize: 10 }}>propia</Tag>}
                            {p.estado === 'ninguna' && <Tag style={{ marginInlineEnd: 0, fontSize: 10 }}>sin tarjetita</Tag>}
                            {onIrACapa ? (
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => onIrACapa(p.id)}
                                    style={{ fontSize: 12, padding: 0, height: 18, textAlign: 'left' }}
                                >
                                    {p.label}
                                </Button>
                            ) : (
                                <Text style={{ fontSize: 12 }}>{p.label}</Text>
                            )}
                        </div>
                    ))}
                    {datos.sinNada.length > 0 && (
                        <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
                            Las que dicen «sin tarjetita» no heredan porque el grupo no tenía una cuando se
                            construyó el árbol: el visor les inventa una. Vuelve a refrescar el árbol de capas.
                        </Text>
                    )}
                </div>
            )}
        </div>
    );
}
