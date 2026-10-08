import { Input, Space, Tag, Typography } from 'antd';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';
import { useConteoFiltro } from '@features/mapalab-layers/hooks/useConteoFiltro';
import { useGeometriaCapa } from '@features/mapalab-layers/hooks/useGeometriaCapa';
import GeometriaTag from './GeometriaTag';

const { Text } = Typography;
const formato = new Intl.NumberFormat('es-MX');

const AYUDA_CAPA = 'Todas las propiedades de un grupo comparten su capa de GeoServer. No se elige: se hereda del grupo.';
const AYUDA_FILTRO = 'Lo único que distingue a esta propiedad de sus hermanas. Se escribe en CQL, por ejemplo cultivo = \'Aguacate\'. Vacío muestra la capa completa.';

export default function PropertySourceField({ capa, nombreGrupo, filtro, onFiltro }) {
    const { geometria, cargando } = useGeometriaCapa(capa.workspaceAlias, capa.geoserverLayer);
    const conteo = useConteoFiltro(capa.workspaceAlias, capa.geoserverLayer, filtro);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Space size={6}>
                    <Text style={{ fontSize: 13, fontWeight: 600 }}>Capa</Text>
                    <InfoIcon title={AYUDA_CAPA} />
                </Space>
                <Space size={6} wrap>
                    <Tag bordered={false}>{capa.workspaceAlias}:{capa.geoserverLayer}</Tag>
                    <GeometriaTag geometria={geometria} buscando={cargando} />
                    <Text type="secondary" style={{ fontSize: 12 }}>la de {nombreGrupo}</Text>
                </Space>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Space size={6}>
                    <Text style={{ fontSize: 13, fontWeight: 600 }}>Filtro</Text>
                    <InfoIcon title={AYUDA_FILTRO} />
                </Space>
                <Input
                    value={filtro}
                    onChange={(e) => onFiltro(e.target.value)}
                    placeholder="cultivo = 'Aguacate'"
                    status={conteo.error ? 'error' : undefined}
                    style={{ fontFamily: 'monospace' }}
                />
                <Text type={conteo.error ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                    {conteo.cargando && 'Contando registros...'}
                    {!conteo.cargando && conteo.error && conteo.error}
                    {!conteo.cargando && !conteo.error && conteo.total !== null
                        && `${formato.format(conteo.total)} ${conteo.total === 1 ? 'registro' : 'registros'}${filtro?.trim() ? '' : ' (capa completa)'}`}
                </Text>
            </div>
        </div>
    );
}
