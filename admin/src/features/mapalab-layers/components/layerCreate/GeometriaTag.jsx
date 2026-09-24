import { Space, Tag, Typography } from 'antd';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';

const { Text } = Typography;

const ETIQUETA = {
    point: 'Punto',
    line: 'Línea',
    polygon: 'Polígono',
    raster: 'Ráster',
};

const SIN_GEOMETRIA = 'GeoServer no reporta geometría para esta capa. El nodo se crea igual y el job de dataengine la clasifica después.';

export default function GeometriaTag({ geometria, buscando }) {
    if (buscando) return <Tag bordered={false}>Consultando geometría...</Tag>;
    if (geometria) return <Tag bordered={false} color="blue">{ETIQUETA[geometria]}</Tag>;
    return (
        <Space size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>Sin geometría</Text>
            <InfoIcon title={SIN_GEOMETRIA} />
        </Space>
    );
}
