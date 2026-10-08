import { useCallback, useMemo, useState } from 'react';
import { Space, Tabs, Tooltip, Typography } from 'antd';
import { GridPanel } from '@shared/components/dataGrid';
import { METADATA_GRID_CATALOGS } from '@features/mapalab-layers/constants/metadataCatalogs';
import { LAYER_CONFIG_CATALOGS } from '@features/mapalab-layers/constants/layerConfigCatalogs';
import useIsMobile from '@shared/hooks/useIsMobile';
import { useFullscreenHeader } from '@app/fullscreenHeader';

const { Text } = Typography;

const TREE_PATH = '/mapalab/layers';

const METADATA_SEARCH_FIELDS = ['layer_key', 'layer_name_usuario', 'descripcion'];
const CONFIG_SEARCH_FIELDS = ['id', 'label', 'slug', 'geoserver_layer', 'ruta'];

const TABS_STYLES = `
    .captura-masiva-tabs { height: 100%; display: flex; flex-direction: column; min-height: 0; }
    .captura-masiva-tabs > .ant-tabs-content-holder { flex: 1; min-height: 0; overflow: hidden; }
    .captura-masiva-tabs > .ant-tabs-content-holder > .ant-tabs-content { height: 100%; }
    .captura-masiva-tabs .ant-tabs-tabpane { height: 100%; overflow: hidden; }
    .captura-masiva-tabs > .ant-tabs-nav {
        background: #fafafa;
        border-top: 1px solid rgba(5, 5, 5, 0.06);
        padding: 0 6px;
        min-height: 30px;
    }
    .captura-masiva-tabs > .ant-tabs-nav::before { display: none; }
    .captura-masiva-tabs > .ant-tabs-nav .ant-tabs-nav-wrap { flex: 0 0 auto; }
    .captura-masiva-tabs > .ant-tabs-nav .ant-tabs-extra-content { flex: 1 1 auto; min-width: 0; }
    .captura-masiva-tabs > .ant-tabs-nav .ant-tabs-tab {
        background: transparent;
        border-color: transparent;
        border-radius: 0 0 8px 8px;
        margin: 0 3px 0 0;
        padding: 4px 16px;
        font-size: 12px;
    }
    .captura-masiva-tabs > .ant-tabs-nav .ant-tabs-tab:hover { background: rgba(5, 5, 5, 0.04); }
    .captura-masiva-tabs > .ant-tabs-nav .ant-tabs-tab-active {
        background: #fff;
        border-color: rgba(5, 5, 5, 0.1);
        border-top-color: transparent;
        box-shadow: 0 1px 2px rgba(5, 5, 5, 0.06);
    }
    .captura-masiva-tabs > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { font-weight: 600; }
`;

const isNumeraliaColumn = (key) => key.startsWith('numeralia_');

const DYNAMIC_STATS_HINT = 'Estas capas calculan su numeralia desde la base de datos: '
    + 'las celdas rayadas están bloqueadas aquí y se editan en la pestaña Metadatos de la capa.';

const LEGEND_SWATCH = {
    display: 'inline-block',
    width: 10,
    height: 10,
    borderRadius: 2,
    border: '1px solid #d9d9d9',
};

const tabLabel = (text, dirtyCount) => (dirtyCount ? `${text} · ${dirtyCount}` : text);

export default function MetadataGridPage() {
    const { isDesktop } = useIsMobile();
    const [tab, setTab] = useState('metadatos');
    const [toolbar, setToolbar] = useState(null);
    const [status, setStatus] = useState(null);
    const [dirtyMetadatos, setDirtyMetadatos] = useState(0);
    const [dirtyConfiguracion, setDirtyConfiguracion] = useState(0);

    useFullscreenHeader({
        title: isDesktop ? 'Capas MapaLab · captura masiva' : 'Captura masiva',
        backTo: TREE_PATH,
        extra: toolbar,
    });

    const isCellDisabled = useCallback((rowData, meta) => {
        if (!rowData) return false;
        return Boolean(rowData.has_dynamic_stats) && isNumeraliaColumn(meta.key);
    }, []);

    const renderMetadataStatusExtra = useCallback((data) => {
        const dynamic = data.filter((row) => row.has_dynamic_stats).length;
        const pending = data.filter((row) => !row.descripcion || !String(row.descripcion).trim()).length;
        if (!dynamic && !pending) return null;
        return (
            <Space size={10}>
                {dynamic > 0 && (
                    <Tooltip title={DYNAMIC_STATS_HINT}>
                        <Space size={4}>
                            <span className="grid-cell-locked" style={LEGEND_SWATCH} />
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {dynamic} con numeralia dinámica
                            </Text>
                        </Space>
                    </Tooltip>
                )}
                {pending > 0 && (
                    <Tooltip title="Capas sin descripción capturada">
                        <Text type="secondary" style={{ fontSize: 11 }}>{pending} sin descripción</Text>
                    </Tooltip>
                )}
            </Space>
        );
    }, []);

    const items = useMemo(() => [
        {
            key: 'metadatos',
            forceRender: true,
            label: tabLabel('Metadatos', dirtyMetadatos),
            children: (
                <GridPanel
                    resource="layer-metadata"
                    rowKeyField="layer_key"
                    catalogs={METADATA_GRID_CATALOGS}
                    filterField="workspace"
                    filterLabel="Workspace"
                    filterAllLabel="Todos los workspaces"
                    searchFields={METADATA_SEARCH_FIELDS}
                    searchPlaceholder="Buscar capa, nombre o descripción"
                    itemsLabel="capas"
                    exportFileName="metadatos-capas"
                    rowLabelField="layer_name_usuario"
                    isCellDisabled={isCellDisabled}
                    renderStatusExtra={renderMetadataStatusExtra}
                    active={tab === 'metadatos'}
                    onToolbarChange={setToolbar}
                    onStatusChange={setStatus}
                    onDirtyCountChange={setDirtyMetadatos}
                />
            ),
        },
        {
            key: 'configuracion',
            forceRender: true,
            label: tabLabel('Configuración', dirtyConfiguracion),
            children: (
                <GridPanel
                    resource="layer-config"
                    rowKeyField="id"
                    catalogs={LAYER_CONFIG_CATALOGS}
                    filterField="workspace_alias"
                    filterLabel="Workspace"
                    filterAllLabel="Todos los workspaces"
                    searchFields={CONFIG_SEARCH_FIELDS}
                    searchPlaceholder="Buscar por nombre, id, slug o capa de GeoServer"
                    itemsLabel="nodos"
                    exportFileName="configuracion-capas"
                    rowLabelField="label"
                    active={tab === 'configuracion'}
                    onToolbarChange={setToolbar}
                    onStatusChange={setStatus}
                    onDirtyCountChange={setDirtyConfiguracion}
                />
            ),
        },
    ], [
        tab, dirtyMetadatos, dirtyConfiguracion, isCellDisabled, renderMetadataStatusExtra,
    ]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <style>{TABS_STYLES}</style>
            <Tabs
                className="captura-masiva-tabs"
                activeKey={tab}
                onChange={setTab}
                type="card"
                size="small"
                tabPlacement="bottom"
                tabBarExtraContent={{ right: status }}
                tabBarStyle={{ margin: 0, flexShrink: 0 }}
                items={items}
            />
        </div>
    );
}
