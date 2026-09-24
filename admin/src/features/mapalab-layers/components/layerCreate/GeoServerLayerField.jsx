import { useEffect, useState } from 'react';
import { Select, Space, Switch, Tag, Typography } from 'antd';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';
import api from '@shared/services/api';

const { Text } = Typography;

const GEOMETRIA_LABEL = {
    point: 'Punto',
    line: 'Línea',
    polygon: 'Polígono',
    raster: 'Ráster',
};

const SIN_GEOMETRIA = 'GeoServer no reporta geometría para esta capa. Se registra igual y la clasifica después el job de dataengine.';

export default function GeoServerLayerField({
    value,
    onChange,
    onGeometry,
    opciones,
    cargando,
    soloNoRegistradas,
    onSoloNoRegistradas,
}) {
    const [geometria, setGeometria] = useState(null);
    const [buscando, setBuscando] = useState(false);

    useEffect(() => {
        onGeometry?.(geometria);
    }, [geometria, onGeometry]);

    useEffect(() => {
        if (!value) {
            setGeometria(null);
            return undefined;
        }
        const [alias, capa] = value.split('::');
        if (!alias || !capa) return undefined;
        let cancelado = false;
        setBuscando(true);
        setGeometria(null);
        api.get(`/geoserver/workspaces/${alias}/layers/${encodeURIComponent(capa)}/geometry`)
            .then((res) => { if (!cancelado) setGeometria(res.data?.geometryType || null); })
            .catch(() => { if (!cancelado) setGeometria(null); })
            .finally(() => { if (!cancelado) setBuscando(false); });
        return () => { cancelado = true; };
    }, [value]);

    const [alias, capa] = (value || '').split('::');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size={6}>
                    <Text style={{ fontSize: 13, fontWeight: 600 }}>Capa de GeoServer</Text>
                    <InfoIcon title="De aquí salen la geometría, los campos y la simbología. Un nodo sin capa de GeoServer no se dibuja en el visor." />
                </Space>
                <Space size={6}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Solo no registradas</Text>
                    <Switch size="small" checked={soloNoRegistradas} onChange={onSoloNoRegistradas} />
                </Space>
            </div>
            <Select
                showSearch
                allowClear
                loading={cargando}
                value={value}
                onChange={onChange}
                placeholder={soloNoRegistradas ? 'Buscar capa no registrada...' : 'Buscar entre todas las capas...'}
                options={opciones}
                optionFilterProp="label"
                filterOption={(input, option) => {
                    if (!option?.value) return false;
                    const q = input.toLowerCase();
                    return option.label?.toLowerCase().includes(q) || option.value.toLowerCase().includes(q);
                }}
                notFoundContent={cargando ? 'Cargando...' : 'Sin capas disponibles'}
                styles={{ popup: { root: { maxHeight: 320 } } }}
            />
            {value && (
                <Space size={6} wrap>
                    <Tag bordered={false}>{alias}</Tag>
                    <Tag bordered={false}>{capa}</Tag>
                    {buscando && <Tag bordered={false}>Consultando geometría...</Tag>}
                    {!buscando && geometria && <Tag bordered={false} color="blue">{GEOMETRIA_LABEL[geometria]}</Tag>}
                    {!buscando && !geometria && (
                        <Space size={4}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Sin geometría</Text>
                            <InfoIcon title={SIN_GEOMETRIA} />
                        </Space>
                    )}
                </Space>
            )}
        </div>
    );
}
