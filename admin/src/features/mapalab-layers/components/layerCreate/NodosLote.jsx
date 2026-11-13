import { useEffect } from 'react';
import { Button, Input, Space, Tag, Typography } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';
import { useGeometriaCapa } from '@features/mapalab-layers/hooks/useGeometriaCapa';
import GeometriaTag from './GeometriaTag';

const { Text } = Typography;

const AYUDA_NOMBRE = 'Es lo que se lee en el árbol del visor. Se propone desde el nombre de la capa de GeoServer; cámbialo si el público la conoce de otra forma.';
const AYUDA_IDS = 'El ID es único en el árbol y la URL es la del visor. Se arman solos desde el nombre.';

function FilaNodo({ fila, error, onCambio, onQuitar, editandoIds, showSlug }) {
    const [alias, capa] = (fila.gsRef || '').split('::');
    const { geometria, cargando } = useGeometriaCapa(alias, capa);

    useEffect(() => {
        if (fila.gsRef && fila.geometria !== geometria) onCambio({ geometria });
    }, [geometria, fila.gsRef, fila.geometria, onCambio]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Input
                    value={fila.label}
                    placeholder="Ej: Cuerpos de agua"
                    status={error ? 'error' : undefined}
                    aria-label="Nombre"
                    onChange={(e) => onCambio({ label: e.target.value })}
                />
                {onQuitar && (
                    <Button type="text" shape="circle" size="small" icon={<CloseOutlined />} onClick={onQuitar} aria-label="Quitar" />
                )}
            </div>
            {editandoIds && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Input
                        size="small"
                        prefix={<Text type="secondary" style={{ fontSize: 12 }}>ID</Text>}
                        value={fila.id}
                        onChange={(e) => onCambio({ id: e.target.value })}
                        style={{ flex: '1 1 160px' }}
                    />
                    {showSlug && (
                        <Input
                            size="small"
                            prefix={<Text type="secondary" style={{ fontSize: 12 }}>URL /</Text>}
                            value={fila.slug}
                            onChange={(e) => onCambio({ slug: e.target.value })}
                            style={{ flex: '1 1 160px' }}
                        />
                    )}
                </div>
            )}
            <Space size={6} wrap>
                {fila.gsRef && <Tag bordered={false} style={{ marginInlineEnd: 0 }}>{alias}:{capa}</Tag>}
                {fila.gsRef && <GeometriaTag geometria={geometria} buscando={cargando} />}
                {!editandoIds && <Text type="secondary" style={{ fontSize: 12 }}>ID <Text code>{fila.id || '—'}</Text></Text>}
                {!editandoIds && showSlug && <Text type="secondary" style={{ fontSize: 12 }}>URL <Text code>/{fila.slug || '—'}</Text></Text>}
            </Space>
            {error && <Text type="danger" style={{ fontSize: 12 }}>{error}</Text>}
        </div>
    );
}

export default function NodosLote({ filas, errores, onCambio, onQuitar, onAgregar, editandoIds, onEditarIds, showSlug }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Space size={6}>
                    <Text style={{ fontSize: 13, fontWeight: 600 }}>{filas.length > 1 ? `Nombres (${filas.length})` : 'Nombre'}</Text>
                    <InfoIcon title={AYUDA_NOMBRE} />
                </Space>
                <Space size={6}>
                    <InfoIcon title={AYUDA_IDS} />
                    <Button type="link" size="small" style={{ padding: 0 }} onClick={onEditarIds}>
                        {editandoIds ? 'Listo' : 'Editar IDs'}
                    </Button>
                </Space>
            </div>
            {filas.map((fila) => (
                <FilaNodo
                    key={fila.uid}
                    fila={fila}
                    error={errores[fila.uid]}
                    onCambio={(cambios) => onCambio(fila.uid, cambios)}
                    onQuitar={filas.length > 1 ? () => onQuitar(fila.uid) : null}
                    editandoIds={editandoIds}
                    showSlug={showSlug}
                />
            ))}
            {onAgregar && (
                <Button type="link" size="small" icon={<PlusOutlined />} style={{ padding: 0, alignSelf: 'flex-start' }} onClick={onAgregar}>
                    Agregar otro
                </Button>
            )}
        </div>
    );
}
