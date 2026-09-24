import { useEffect } from 'react';
import { Select, Space, Tag, Typography } from 'antd';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';
import { useGeometriaCapa } from '@features/mapalab-layers/hooks/useGeometriaCapa';
import GeometriaTag from './GeometriaTag';

const { Text } = Typography;

const AYUDA_CAPA = 'De aquí salen la geometría, los campos y la simbología. Un nodo sin capa de GeoServer no se dibuja en el visor.';
const AYUDA_USO = 'Ya hay nodos del árbol que la usan. Es normal en las propiedades de un grupo, que comparten capa y se distinguen por su filtro.';

export default function GeoServerLayerField({ value, onChange, onGeometry, opciones, cargando }) {
    const [alias, capa] = (value || '').split('::');
    const { geometria, cargando: buscando } = useGeometriaCapa(alias, capa);
    const usoActual = opciones.flatMap((g) => g.options || []).find((o) => o.value === value)?.uso || 0;

    useEffect(() => {
        onGeometry?.(geometria);
    }, [geometria, onGeometry]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Space size={6}>
                <Text style={{ fontSize: 13, fontWeight: 600 }}>Capa de GeoServer</Text>
                <InfoIcon title={AYUDA_CAPA} />
            </Space>
            <Select
                showSearch
                allowClear
                loading={cargando}
                value={value}
                onChange={onChange}
                placeholder="Busca por nombre de capa o de workspace"
                options={opciones}
                optionFilterProp="label"
                filterOption={(input, option) => {
                    if (!option?.value) return false;
                    const q = input.toLowerCase();
                    return option.label?.toLowerCase().includes(q) || option.value.toLowerCase().includes(q);
                }}
                optionRender={({ data }) => (
                    <Space size={8} style={{ justifyContent: 'space-between', width: '100%' }}>
                        <span>{data.label}</span>
                        {data.uso > 0 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>en el árbol ×{data.uso}</Text>
                        )}
                    </Space>
                )}
                notFoundContent={cargando ? 'Cargando...' : 'Sin capas disponibles'}
                styles={{ popup: { root: { maxHeight: 320 } } }}
            />
            {value && (
                <Space size={6} wrap>
                    <Tag bordered={false}>{alias}</Tag>
                    <Tag bordered={false}>{capa}</Tag>
                    <GeometriaTag geometria={geometria} buscando={buscando} />
                    {usoActual > 0 && (
                        <Space size={4}>
                            <Text type="secondary" style={{ fontSize: 12 }}>en el árbol ×{usoActual}</Text>
                            <InfoIcon title={AYUDA_USO} />
                        </Space>
                    )}
                </Space>
            )}
        </div>
    );
}
