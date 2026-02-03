import { useState } from 'react';
import {
    Card,
    Button,
    Space,
    Typography,
    Upload,
    message,
    Modal,
    Checkbox,
    Alert,
    Divider,
    List,
    Tag,
    Progress,
    Radio,
    Select
} from 'antd';
import {
    DownloadOutlined,
    UploadOutlined,
    FileOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    InfoCircleOutlined,
    ExportOutlined,
    ImportOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

export default function ImportExport() {
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [exportOptions, setExportOptions] = useState({
        includePages: true,
        includeMedia: false,
        includeStyles: false,
        includeMenus: false,
        includeUsers: false
    });
    const [exportScope, setExportScope] = useState('all');
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState(null);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);

    const mockPages = [
        { id: '1', title: 'Página Principal', slug: '/' },
        { id: '2', title: 'Servicios', slug: '/servicios' },
        { id: '3', title: 'Contacto', slug: '/contacto' }
    ];

    const handleExport = () => {
        setExporting(true);

        setTimeout(() => {
            const exportData = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                options: exportOptions,
                data: {
                    pages: exportOptions.includePages ? mockPages : [],
                    media: exportOptions.includeMedia ? [] : [],
                    styles: exportOptions.includeStyles ? {} : {},
                    menus: exportOptions.includeMenus ? [] : [],
                    users: exportOptions.includeUsers ? [] : []
                }
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `cms-export-${new Date().getTime()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setExporting(false);
            setExportModalVisible(false);
            message.success('Exportación completada correctamente');
        }, 1500);
    };

    const handleFileUpload = (file) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!data.version || !data.data) {
                    message.error('Formato de archivo inválido');
                    return;
                }

                const preview = {
                    version: data.version,
                    exportDate: data.exportDate,
                    pagesCount: data.data.pages?.length || 0,
                    mediaCount: data.data.media?.length || 0,
                    stylesCount: Object.keys(data.data.styles || {}).length,
                    menusCount: data.data.menus?.length || 0,
                    usersCount: data.data.users?.length || 0,
                    pages: data.data.pages || []
                };

                setImportPreview(preview);
                setImportFile(data);
                message.success('Archivo cargado correctamente');
            } catch (error) {
                message.error('Error al leer el archivo: ' + error.message);
            }
        };

        reader.readAsText(file);
    };

    const handleImport = () => {
        if (!importFile) {
            message.error('No hay archivo seleccionado');
            return;
        }

        Modal.confirm({
            title: '¿Confirmar importación?',
            icon: <WarningOutlined style={{ color: '#faad14' }} />,
            content: (
                <Space orientation="vertical">
                    <Alert
                        message="Advertencia"
                        description="Los datos existentes con el mismo ID serán reemplazados. Esta acción no se puede deshacer."
                        type="warning"
                        showIcon
                    />
                    <Paragraph>
                        Se importarán:
                        <ul>
                            {importPreview.pagesCount > 0 && <li>{importPreview.pagesCount} página(s)</li>}
                            {importPreview.mediaCount > 0 && <li>{importPreview.mediaCount} archivo(s) multimedia</li>}
                            {importPreview.stylesCount > 0 && <li>{importPreview.stylesCount} estilo(s)</li>}
                            {importPreview.menusCount > 0 && <li>{importPreview.menusCount} menú(s)</li>}
                        </ul>
                    </Paragraph>
                </Space>
            ),
            okText: 'Importar',
            okType: 'primary',
            cancelText: 'Cancelar',
            onOk: () => {
                setImporting(true);

                setTimeout(() => {
                    setImporting(false);
                    setImportModalVisible(false);
                    setImportFile(null);
                    setImportPreview(null);
                    message.success('Importación completada correctamente');
                }, 2000);
            }
        });
    };

    const uploadProps = {
        name: 'file',
        multiple: false,
        accept: '.json',
        beforeUpload: handleFileUpload,
        showUploadList: false
    };

    return (
        <div>
            <Card>
                <Space orientation="vertical" style={{ width: '100%' }} size="large">
                    <Title level={4}>
                        <ExportOutlined /> Exportación e Importación
                    </Title>

                    <Alert
                        message="Gestión de Contenido"
                        description="Exporta e importa el contenido de tu sitio para realizar respaldos o migrar entre entornos."
                        type="info"
                        showIcon
                    />

                    <Card
                        title={
                            <Space>
                                <DownloadOutlined />
                                <Text strong>Exportar Contenido</Text>
                            </Space>
                        }
                        extra={
                            <Button
                                type="primary"
                                icon={<DownloadOutlined />}
                                onClick={() => setExportModalVisible(true)}
                            >
                                Exportar
                            </Button>
                        }
                    >
                        <Space orientation="vertical" style={{ width: '100%' }}>
                            <Paragraph>
                                Exporta el contenido de tu sitio en formato JSON. Puedes seleccionar qué elementos deseas incluir en la exportación.
                            </Paragraph>

                            <List
                                size="small"
                                dataSource={[
                                    { icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />, text: 'Formato JSON compatible' },
                                    { icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />, text: 'Incluye estructura y contenido' },
                                    { icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />, text: 'Ideal para respaldos y migraciones' }
                                ]}
                                renderItem={item => (
                                    <List.Item>
                                        <Space>
                                            {item.icon}
                                            <Text>{item.text}</Text>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </Space>
                    </Card>

                    <Card
                        title={
                            <Space>
                                <UploadOutlined />
                                <Text strong>Importar Contenido</Text>
                            </Space>
                        }
                        extra={
                            <Button
                                type="primary"
                                icon={<UploadOutlined />}
                                onClick={() => setImportModalVisible(true)}
                            >
                                Importar
                            </Button>
                        }
                    >
                        <Space orientation="vertical" style={{ width: '100%' }}>
                            <Paragraph>
                                Importa contenido desde un archivo JSON previamente exportado. El sistema validará la estructura antes de proceder.
                            </Paragraph>

                            <List
                                size="small"
                                dataSource={[
                                    { icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />, text: 'Validación automática de formato' },
                                    { icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />, text: 'Vista previa antes de importar' },
                                    { icon: <WarningOutlined style={{ color: '#faad14' }} />, text: 'Los elementos existentes serán reemplazados' }
                                ]}
                                renderItem={item => (
                                    <List.Item>
                                        <Space>
                                            {item.icon}
                                            <Text>{item.text}</Text>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </Space>
                    </Card>
                </Space>
            </Card>

            <Modal
                title={
                    <Space>
                        <DownloadOutlined />
                        <Text strong>Configurar Exportación</Text>
                    </Space>
                }
                open={exportModalVisible}
                onCancel={() => setExportModalVisible(false)}
                onOk={handleExport}
                okText="Exportar"
                cancelText="Cancelar"
                confirmLoading={exporting}
                width={600}
            >
                <Space orientation="vertical" style={{ width: '100%' }} size="large">
                    <Alert
                        message="Selecciona qué deseas exportar"
                        description="El archivo de exportación incluirá todos los elementos seleccionados en formato JSON."
                        type="info"
                        showIcon
                    />

                    <div>
                        <Text strong style={{ display: 'block', marginBottom: 12 }}>
                            Alcance de la exportación:
                        </Text>
                        <Radio.Group
                            value={exportScope}
                            onChange={(e) => setExportScope(e.target.value)}
                            style={{ width: '100%' }}
                        >
                            <Space orientation="vertical" style={{ width: '100%' }}>
                                <Radio value="all">Exportar todo el sitio</Radio>
                                <Radio value="selected">Exportar páginas seleccionadas</Radio>
                            </Space>
                        </Radio.Group>
                    </div>

                    {exportScope === 'selected' && (
                        <Select
                            mode="multiple"
                            style={{ width: '100%' }}
                            placeholder="Selecciona las páginas a exportar"
                            options={mockPages.map(page => ({
                                label: page.title,
                                value: page.id
                            }))}
                        />
                    )}

                    <Divider />

                    <div>
                        <Text strong style={{ display: 'block', marginBottom: 12 }}>
                            Elementos a incluir:
                        </Text>
                        <Space orientation="vertical">
                            <Checkbox
                                checked={exportOptions.includePages}
                                onChange={(e) => setExportOptions({ ...exportOptions, includePages: e.target.checked })}
                            >
                                Páginas y contenido
                            </Checkbox>
                            <Checkbox
                                checked={exportOptions.includeMedia}
                                onChange={(e) => setExportOptions({ ...exportOptions, includeMedia: e.target.checked })}
                            >
                                Archivos multimedia (referencias)
                            </Checkbox>
                            <Checkbox
                                checked={exportOptions.includeStyles}
                                onChange={(e) => setExportOptions({ ...exportOptions, includeStyles: e.target.checked })}
                            >
                                Estilos y temas
                            </Checkbox>
                            <Checkbox
                                checked={exportOptions.includeMenus}
                                onChange={(e) => setExportOptions({ ...exportOptions, includeMenus: e.target.checked })}
                            >
                                Estructura de menús
                            </Checkbox>
                            <Checkbox
                                checked={exportOptions.includeUsers}
                                onChange={(e) => setExportOptions({ ...exportOptions, includeUsers: e.target.checked })}
                                disabled
                            >
                                Usuarios (no disponible por seguridad)
                            </Checkbox>
                        </Space>
                    </div>

                    {exporting && (
                        <>
                            <Divider />
                            <Progress percent={66} status="active" />
                            <Text type="secondary">Generando archivo de exportación...</Text>
                        </>
                    )}
                </Space>
            </Modal>

            <Modal
                title={
                    <Space>
                        <UploadOutlined />
                        <Text strong>Importar Contenido</Text>
                    </Space>
                }
                open={importModalVisible}
                onCancel={() => {
                    setImportModalVisible(false);
                    setImportFile(null);
                    setImportPreview(null);
                }}
                onOk={handleImport}
                okText="Importar"
                cancelText="Cancelar"
                confirmLoading={importing}
                okButtonProps={{ disabled: !importFile }}
                width={600}
            >
                <Space orientation="vertical" style={{ width: '100%' }} size="large">
                    <Alert
                        message="Sube un archivo JSON de exportación"
                        description="El sistema validará la estructura del archivo antes de permitir la importación."
                        type="info"
                        showIcon
                    />

                    <Dragger {...uploadProps}>
                        <p className="ant-upload-drag-icon">
                            <FileOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                        </p>
                        <p className="ant-upload-text">
                            Haz clic o arrastra el archivo aquí
                        </p>
                        <p className="ant-upload-hint">
                            Solo archivos JSON (.json) son soportados
                        </p>
                    </Dragger>

                    {importPreview && (
                        <>
                            <Divider />
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 12 }}>
                                    Vista previa de importación:
                                </Text>
                                <Card size="small">
                                    <Space orientation="vertical" style={{ width: '100%' }}>
                                        <Space>
                                            <Tag color="blue">Versión: {importPreview.version}</Tag>
                                            <Text type="secondary">
                                                Exportado: {new Date(importPreview.exportDate).toLocaleString('es-ES')}
                                            </Text>
                                        </Space>

                                        <Divider style={{ margin: '8px 0' }} />

                                        <Space orientation="vertical">
                                            {importPreview.pagesCount > 0 && (
                                                <Text><FileOutlined /> {importPreview.pagesCount} página(s)</Text>
                                            )}
                                            {importPreview.mediaCount > 0 && (
                                                <Text><FileOutlined /> {importPreview.mediaCount} archivo(s) multimedia</Text>
                                            )}
                                            {importPreview.stylesCount > 0 && (
                                                <Text><FileOutlined /> {importPreview.stylesCount} estilo(s)</Text>
                                            )}
                                            {importPreview.menusCount > 0 && (
                                                <Text><FileOutlined /> {importPreview.menusCount} menú(s)</Text>
                                            )}
                                        </Space>

                                        {importPreview.pages.length > 0 && (
                                            <>
                                                <Divider style={{ margin: '8px 0' }} />
                                                <Text strong style={{ fontSize: 12 }}>Páginas a importar:</Text>
                                                <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                                                    {importPreview.pages.map((page, index) => (
                                                        <div key={index}>
                                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                                • {page.title} ({page.slug})
                                                            </Text>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </Space>
                                </Card>
                            </div>

                            <Alert
                                message="Importante"
                                description="Los elementos existentes con el mismo identificador serán reemplazados. Asegúrate de tener un respaldo antes de continuar."
                                type="warning"
                                showIcon
                            />
                        </>
                    )}

                    {importing && (
                        <>
                            <Divider />
                            <Progress percent={75} status="active" />
                            <Text type="secondary">Importando contenido...</Text>
                        </>
                    )}
                </Space>
            </Modal>
        </div>
    );
}
