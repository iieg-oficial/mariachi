import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Empty,
    Input,
    Layout,
    List,
    Popconfirm,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import {
    DeleteOutlined,
    FontSizeOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import {
    deleteGeoserverFile,
    listGeoserverFonts,
    reloadGeoserverFonts,
} from '@features/sextante/api/geoserverFilesService';
import FileUploadModal from '@features/sextante/components/FileUploadModal';
import { FONT_EXT, basename, workspaceLabel } from '@features/sextante/utils/geoserverFiles';
import PageHeading from '@shared/components/PageHeading';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Text } = Typography;


export default function FontsPage() {
    const [data, setData] = useState({ families: [], files: [], pendingReload: false });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [uploadOpen, setUploadOpen] = useState(false);
    const [reloading, setReloading] = useState(false);
    const [deletingName, setDeletingName] = useState(null);
    const { isMobile } = useIsMobile();

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await listGeoserverFonts());
        } catch (err) {
            setError(err?.response?.data?.detail || 'Error al cargar las tipografías');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    const handleReload = async () => {
        setReloading(true);
        try {
            await reloadGeoserverFonts();
            message.success('GeoServer recargó su catálogo de tipografías');
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al recargar GeoServer');
        } finally {
            setReloading(false);
        }
    };

    const handleDelete = async (file) => {
        setDeletingName(file.name);
        try {
            await deleteGeoserverFile(file.name, file.workspace || '');
            message.success(`Eliminada: ${basename(file.name)}`);
            await reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar');
        } finally {
            setDeletingName(null);
        }
    };

    const needle = search.trim().toLowerCase();

    const matches = useCallback((value) => !needle || value.toLowerCase().includes(needle), [needle]);

    const propias = useMemo(
        () => data.families.filter((f) => f.source !== 'sistema' && matches(f.name)),
        [data.families, matches],
    );

    const sistema = useMemo(
        () => data.families.filter((f) => f.source === 'sistema' && matches(f.name)),
        [data.families, matches],
    );

    const files = useMemo(
        () => data.files.filter((f) => matches(f.name)),
        [data.files, matches],
    );

    return (
        <Content style={{ padding: isMobile ? 6 : 24 }}>
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                <PageHeading
                    icon={<FontSizeOutlined />}
                    title="Tipografías"
                    description={
                        <>
                            Fuentes TTF y OTF que GeoServer puede usar en las etiquetas de un SLD
                            (<Text code>font-family</Text>). Se suben a <Text code>styles/</Text> igual
                            que el resto de recursos, pero GeoServer solo las registra después de
                            recargar su catálogo.
                        </>
                    }
                    marginBottom={0}
                    extra={
                        <Space wrap>
                            <Button icon={<ReloadOutlined />} onClick={reload} disabled={loading} />
                            <Button
                                icon={<SyncOutlined />}
                                onClick={handleReload}
                                loading={reloading}
                                type={data.pendingReload ? 'primary' : 'default'}
                                ghost={data.pendingReload}
                            >
                                Recargar en GeoServer
                            </Button>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadOpen(true)}>
                                Subir tipografías
                            </Button>
                        </Space>
                    }
                />

                {error && <Alert type="error" showIcon closable title={error} />}

                {data.pendingReload && (
                    <Alert
                        type="warning"
                        showIcon
                        title="Hay tipografías subidas que GeoServer todavía no reconoce"
                        description="Usa «Recargar en GeoServer» para que queden disponibles en los SLDs. La recarga vuelve a leer todo el catálogo, así que conviene hacerla al terminar de subir."
                    />
                )}

                <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Buscar por nombre de familia o de archivo"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="large"
                />

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
                ) : (
                    <>
                        <Card
                            size="small"
                            title={<span><FontSizeOutlined /> Archivos subidos ({files.length})</span>}
                        >
                            {files.length === 0 ? (
                                <Empty description="Todavía no hay archivos de tipografía. Súbelos con el botón de arriba." />
                            ) : (
                                <List
                                    size="small"
                                    dataSource={files}
                                    renderItem={(file) => (
                                        <List.Item
                                            actions={[
                                                <Popconfirm
                                                    key="del"
                                                    title="¿Eliminar esta tipografía?"
                                                    description="Los SLDs que la usen volverán a la fuente por defecto."
                                                    okText="Eliminar"
                                                    cancelText="Cancelar"
                                                    okButtonProps={{ danger: true }}
                                                    onConfirm={() => handleDelete(file)}
                                                >
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        loading={deletingName === file.name}
                                                    />
                                                </Popconfirm>,
                                            ]}
                                        >
                                            <Space size={8} wrap>
                                                <Text>{file.name}</Text>
                                                <Tag>{workspaceLabel(file.workspace)}</Tag>
                                                {file.loaded
                                                    ? <Tag color="green">Cargada</Tag>
                                                    : <Tag color="orange">Falta recargar</Tag>}
                                            </Space>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Card>

                        <Card
                            size="small"
                            title={`Nuestras tipografías, ya activas en GeoServer (${propias.length})`}
                            extra={<Text type="secondary" style={{ fontSize: 12 }}>Moradas: subidas aquí · Azules: instaladas en el servidor</Text>}
                        >
                            {propias.length === 0 ? (
                                <Empty description="Ninguna de las fuentes subidas está activa todavía. Sube una y recarga GeoServer." />
                            ) : (
                                <Space wrap size={[4, 8]}>
                                    {propias.map((family) => (
                                        <Tooltip
                                            key={family.name}
                                            title={family.source === 'instalada'
                                                ? 'Instalada a mano en el servidor (repo geoserver, carpeta fonts/)'
                                                : 'Subida desde el CMS'}
                                        >
                                            <Tag
                                                color={family.source === 'instalada' ? 'geekblue' : 'purple'}
                                                style={{ fontFamily: family.name, fontSize: 13, padding: '2px 8px' }}
                                            >
                                                {family.name}
                                            </Tag>
                                        </Tooltip>
                                    ))}
                                </Space>
                            )}
                        </Card>

                        <Card
                            size="small"
                            title={`Tipografías que ya trae GeoServer (${sistema.length})`}
                            extra={<Text type="secondary" style={{ fontSize: 12 }}>No las subimos nosotros; vienen con la imagen</Text>}
                        >
                            {sistema.length === 0 ? (
                                <Empty description="GeoServer no reportó tipografías del sistema." />
                            ) : (
                                <Space wrap size={[4, 8]}>
                                    {sistema.map((family) => (
                                        <Tag
                                            key={family.name}
                                            style={{ fontFamily: family.name, fontSize: 13, padding: '2px 8px' }}
                                        >
                                            {family.name}
                                        </Tag>
                                    ))}
                                </Space>
                            )}
                        </Card>
                    </>
                )}
            </Space>

            <FileUploadModal
                open={uploadOpen}
                currentPath=""
                workspace=""
                destinationLabel={workspaceLabel('')}
                title="Subir tipografías a GeoServer"
                extensions={FONT_EXT}
                hint="TTF, OTF · GeoServer solo lee estos dos formatos (WOFF/WOFF2 no le sirven)"
                onClose={() => setUploadOpen(false)}
                onUploaded={reload}
            />
        </Content>
    );
}
