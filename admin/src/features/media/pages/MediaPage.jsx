import { useState, useEffect } from 'react';
import {
    Card, Button, Upload, Table, Image, Space, message, Modal, Form, Input, Select, 
    Tag, Popconfirm, Row, Col, Statistic, Segmented, Empty, Spin
} from 'antd';
import {
    InboxOutlined, DeleteOutlined, EditOutlined, FolderOutlined, FolderAddOutlined, FileImageOutlined, FilePdfOutlined,
    FileOutlined, AppstoreOutlined, BarsOutlined, DownloadOutlined, CopyOutlined, EyeOutlined
} from '@ant-design/icons';
import mediaService from '@features/media/api/mediaService';
import useIsMobile from '@shared/hooks/useIsMobile';

const { Dragger } = Upload;
const { Search } = Input;
const { Option } = Select;

const Media = () => {
    const { isMobile } = useIsMobile();
    const [loading, setLoading] = useState(false);
    const [buckets, setBuckets] = useState([]);
    const [selectedBucketId, setSelectedBucketId] = useState(null);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [folderModalVisible, setFolderModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [currentFile, setCurrentFile] = useState(null);
    const [form] = Form.useForm();
    const [folderForm] = Form.useForm();
    const [editForm] = Form.useForm();

    useEffect(() => {
        loadBuckets();
        loadFolders();
    }, []);

    useEffect(() => {
        if (selectedBucketId) {
            loadMediaFiles();
        } else {
            setMediaFiles([]);
        }
    }, [selectedBucketId, selectedFolder, selectedType, searchText]);

    const loadBuckets = async () => {
        try {
            const data = await mediaService.getBuckets();
            setBuckets(data);
            if (data.length > 0 && !selectedBucketId) {
                setSelectedBucketId(data[0].id);
            }
        } catch {
            message.error('Error al cargar buckets');
        }
    };

    const loadMediaFiles = async () => {
        try {
            setLoading(true);
            const data = await mediaService.getMediaFiles({
                bucketId: selectedBucketId,
                folder: selectedFolder,
                type: selectedType,
                search: searchText,
            });
            setMediaFiles(data);
        } catch {
            message.error('Error al cargar archivos');
        } finally {
            setLoading(false);
        }
    };

    const loadFolders = async () => {
        try {
            const data = await mediaService.getFolders();
            setFolders(data);
        } catch {
            message.error('Error al cargar carpetas');
        }
    };

    const stats = {
        total: mediaFiles.length,
        images: mediaFiles.filter(f => f.type.startsWith('image/')).length,
        documents: mediaFiles.filter(f => f.type === 'application/pdf').length,
        totalSize: mediaFiles.reduce((sum, f) => sum + f.size, 0)
    };

    const handleUpload = async (options) => {
        const { file, onSuccess, onError, onProgress } = options;

        if (!selectedBucketId) {
            onError(new Error('Selecciona un bucket primero'));
            message.error('Selecciona un bucket primero');
            return;
        }

        try {
            const uploadOptions = {
                bucketId: selectedBucketId,
                folder: form.getFieldValue('folder') || '/',
                alt: form.getFieldValue('alt') || '',
                onProgress: (percent) => {
                    onProgress({ percent });
                },
            };

            const result = await mediaService.uploadMediaFile(file, uploadOptions);
            onSuccess(result);
            message.success(`${file.name} subido exitosamente`);
            loadMediaFiles();
        } catch (error) {
            onError(error);
            message.error(`Error al subir ${file.name}`);
        }
    };

    const handleDelete = async (id) => {
        try {
            await mediaService.deleteMediaFile(id);
            message.success('Archivo eliminado exitosamente');
            loadMediaFiles();
        } catch {
            message.error('Error al eliminar archivo');
        }
    };

    const handleDeleteMultiple = async () => {
        if (selectedFiles.length === 0) {
            message.warning('Seleccione al menos un archivo');
            return;
        }

        try {
            await mediaService.deleteMultipleFiles(selectedFiles);
            message.success(`${selectedFiles.length} archivos eliminados`);
            setSelectedFiles([]);
            loadMediaFiles();
        } catch {
            message.error('Error al eliminar archivos');
        }
    };

    const handleEdit = (file) => {
        setCurrentFile(file);
        editForm.setFieldsValue({
            alt: file.metadata?.alt || '',
            description: file.metadata?.description || '',
            folder: file.folder
        });
        setEditModalVisible(true);
    };

    const handleEditSubmit = async () => {
        try {
            const values = await editForm.validateFields();
            await mediaService.updateMediaFile(currentFile.id, values);
            message.success('Archivo actualizado exitosamente');
            setEditModalVisible(false);
            loadMediaFiles();
        } catch {
            message.error('Error al actualizar archivo');
        }
    };

    const handleCreateFolder = async () => {
        try {
            const values = await folderForm.validateFields();
            await mediaService.createFolder(values.name, values.parent);
            message.success('Carpeta creada exitosamente');
            setFolderModalVisible(false);
            folderForm.resetFields();
            loadFolders();
        } catch {
            message.error('Error al crear carpeta');
        }
    };

    const handleCopyUrl = (url) => {
        navigator.clipboard.writeText(url);
        message.success('URL copiada al portapapeles');
    };

    const handlePreview = (file) => {
        setCurrentFile(file);
        setPreviewVisible(true);
    };

    const getFileIcon = (type) => {
        if (type.startsWith('image/')) return <FileImageOutlined style={{ fontSize: 48, color: '#1890ff' }} />;
        if (type === 'application/pdf') return <FilePdfOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />;
        return <FileOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />;
    };

    const columns = [
        {
            title: 'Previsualización',
            dataIndex: 'thumbnail',
            key: 'thumbnail',
            width: 100,
            render: (thumbnail, record) => (
                record.type.startsWith('image/') ? (
                    <Image
                        src={thumbnail}
                        width={60}
                        height={60}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                        preview={false}
                        onClick={() => handlePreview(record)}
                    />
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        {getFileIcon(record.type)}
                    </div>
                )
            )
        },
        {
            title: 'Nombre',
            dataIndex: 'originalName',
            key: 'originalName',
            sorter: (a, b) => a.originalName.localeCompare(b.originalName),
            render: (text, record) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{text}</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.name}</div>
                </div>
            )
        },
        {
            title: 'Tipo',
            dataIndex: 'type',
            key: 'type',
            width: 150,
            render: (type) => {
                let color = 'default';
                if (type.startsWith('image/')) color = 'blue';
                if (type === 'application/pdf') color = 'red';
                return <Tag color={color}>{type.split('/')[1]?.toUpperCase()}</Tag>;
            }
        },
        {
            title: 'Tamaño',
            dataIndex: 'size',
            key: 'size',
            width: 120,
            sorter: (a, b) => a.size - b.size,
            render: (size) => mediaService.formatFileSize(size)
        },
        {
            title: 'Carpeta',
            dataIndex: 'folder',
            key: 'folder',
            width: 150,
            render: (folder) => (
                <Tag icon={<FolderOutlined />}>{folder || '/'}</Tag>
            )
        },
        {
            title: 'Subido por',
            dataIndex: 'uploadedByName',
            key: 'uploadedByName',
            width: 150
        },
        {
            title: 'Fecha',
            dataIndex: 'uploadedAt',
            key: 'uploadedAt',
            width: 180,
            sorter: (a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt),
            render: (date) => new Date(date).toLocaleString('es-MX')
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handlePreview(record)}
                    />
                    <Button
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyUrl(record.url)}
                    />
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="¿Eliminar este archivo?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Sí"
                        cancelText="No"
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const renderGridView = () => (
        <Row gutter={[16, 16]}>
            {mediaFiles.map(file => (
                <Col key={file.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card
                        hoverable
                        cover={
                            file.type.startsWith('image/') ? (
                                <div style={{ height: 200, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                                    <Image
                                        src={file.thumbnail}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        preview={false}
                                        onClick={() => handlePreview(file)}
                                    />
                                </div>
                            ) : (
                                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                                    {getFileIcon(file.type)}
                                </div>
                            )
                        }
                        actions={[
                            <EyeOutlined key="view" onClick={() => handlePreview(file)} />,
                            <CopyOutlined key="copy" onClick={() => handleCopyUrl(file.url)} />,
                            <EditOutlined key="edit" onClick={() => handleEdit(file)} />,
                            <Popconfirm
                                key="delete"
                                title="¿Eliminar?"
                                onConfirm={() => handleDelete(file.id)}
                                okText="Sí"
                                cancelText="No"
                            >
                                <DeleteOutlined />
                            </Popconfirm>
                        ]}
                    >
                        <Card.Meta
                            title={
                                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {file.originalName}
                                </div>
                            }
                            description={
                                <div>
                                    <div>{mediaService.formatFileSize(file.size)}</div>
                                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                                        {new Date(file.uploadedAt).toLocaleDateString('es-MX')}
                                    </div>
                                </div>
                            }
                        />
                    </Card>
                </Col>
            ))}
        </Row>
    );

    return (
        <div>
            <Card
                title="Media Manager"
                extra={
                    <Space wrap size={[8, 8]} style={{ width: isMobile ? '100%' : 'auto' }}>
                        <Button
                            type="primary"
                            icon={<InboxOutlined />}
                            onClick={() => setUploadModalVisible(true)}
                            block={isMobile}
                        >
                            Subir Archivos
                        </Button>
                        <Button
                            icon={<FolderAddOutlined />}
                            onClick={() => setFolderModalVisible(true)}
                            block={isMobile}
                        >
                            Nueva Carpeta
                        </Button>
                        {selectedFiles.length > 0 && (
                            <Popconfirm
                                title={`¿Eliminar ${selectedFiles.length} archivos?`}
                                onConfirm={handleDeleteMultiple}
                                okText="Sí"
                                cancelText="No"
                            >
                                <Button danger icon={<DeleteOutlined />} block={isMobile}>
                                    Eliminar Seleccionados
                                </Button>
                            </Popconfirm>
                        )}
                    </Space>
                }
            >
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col xs={12} sm={12} md={6}>
                        <Statistic title="Total de Archivos" value={stats.total} />
                    </Col>
                    <Col xs={12} sm={12} md={6}>
                        <Statistic title="Imágenes" value={stats.images} prefix={<FileImageOutlined />} />
                    </Col>
                    <Col xs={12} sm={12} md={6}>
                        <Statistic title="Documentos" value={stats.documents} prefix={<FilePdfOutlined />} />
                    </Col>
                    <Col xs={12} sm={12} md={6}>
                        <Statistic
                            title="Tamaño Total"
                            value={mediaService.formatFileSize(stats.totalSize)}
                        />
                    </Col>
                </Row>

                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 16
                }}>
                    <div style={{ flex: isMobile ? '1 1 100%' : '0 0 240px' }}>
                        <Select
                            placeholder="Bucket"
                            value={selectedBucketId}
                            onChange={setSelectedBucketId}
                            style={{ width: '100%' }}
                            options={buckets.map((b) => ({
                                value: b.id,
                                label: `${b.display_name} · ${b.acervo_bucket}`,
                            }))}
                        />
                    </div>
                    <div style={{ flex: isMobile ? '1 1 100%' : '1 1 240px', minWidth: 0 }}>
                        <Search
                            placeholder="Buscar archivos..."
                            allowClear
                            onSearch={setSearchText}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div style={{ flex: isMobile ? '1 1 calc(50% - 4px)' : '0 0 auto' }}>
                        <Select
                            placeholder="Carpeta"
                            allowClear
                            style={{ width: isMobile ? '100%' : 200 }}
                            onChange={setSelectedFolder}
                            value={selectedFolder}
                        >
                            {folders.map(folder => (
                                <Option key={folder.id} value={folder.path}>
                                    <FolderOutlined /> {folder.name}
                                </Option>
                            ))}
                        </Select>
                    </div>
                    <div style={{ flex: isMobile ? '1 1 calc(50% - 4px)' : '0 0 auto' }}>
                        <Select
                            placeholder="Tipo"
                            allowClear
                            style={{ width: isMobile ? '100%' : 150 }}
                            onChange={setSelectedType}
                            value={selectedType}
                        >
                            <Option value="image">Imágenes</Option>
                            <Option value="application">Documentos</Option>
                            <Option value="video">Videos</Option>
                            <Option value="audio">Audio</Option>
                        </Select>
                    </div>
                    <div style={{ flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
                        <Segmented
                            block={isMobile}
                            options={[
                                { label: 'Grid', value: 'grid', icon: <AppstoreOutlined /> },
                                { label: 'Lista', value: 'list', icon: <BarsOutlined /> }
                            ]}
                            value={viewMode}
                            onChange={setViewMode}
                        />
                    </div>
                </div>

                <Spin spinning={loading}>
                    {mediaFiles.length === 0 ? (
                        <Empty description="No hay archivos" />
                    ) : viewMode === 'grid' ? (
                        renderGridView()
                    ) : (
                        <Table
                            columns={columns}
                            dataSource={mediaFiles}
                            rowKey="id"
                            size={isMobile ? 'small' : 'middle'}
                            rowSelection={{
                                selectedRowKeys: selectedFiles,
                                onChange: setSelectedFiles
                            }}
                            scroll={{ x: 'max-content' }}
                            pagination={{ simple: isMobile }}
                        />
                    )}
                </Spin>
            </Card>

            <Modal
                title="Subir Archivos"
                open={uploadModalVisible}
                onCancel={() => {
                    setUploadModalVisible(false);
                    form.resetFields();
                }}
                footer={null}
                width={isMobile ? '100%' : 600}
                centered={isMobile}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="Carpeta de destino"
                        name="folder"
                        initialValue="/"
                    >
                        <Select>
                            <Option value="/">Raíz</Option>
                            {folders.map(folder => (
                                <Option key={folder.id} value={folder.path}>
                                    <FolderOutlined /> {folder.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Texto alternativo (opcional)"
                        name="alt"
                    >
                        <Input.TextArea rows={2} placeholder="Descripción del archivo para accesibilidad" />
                    </Form.Item>

                    <Form.Item>
                        <Dragger
                            name="file"
                            multiple
                            customRequest={handleUpload}
                            showUploadList={{
                                showRemoveIcon: true
                            }}
                        >
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">
                                Haz clic o arrastra archivos aquí
                            </p>
                            <p className="ant-upload-hint">
                                Soporta carga individual o múltiple
                            </p>
                        </Dragger>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Nueva Carpeta"
                open={folderModalVisible}
                onOk={handleCreateFolder}
                onCancel={() => {
                    setFolderModalVisible(false);
                    folderForm.resetFields();
                }}
                width={isMobile ? '100%' : 520}
                centered={isMobile}
            >
                <Form form={folderForm} layout="vertical">
                    <Form.Item
                        label="Nombre de la carpeta"
                        name="name"
                        rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
                    >
                        <Input placeholder="Ej: imagenes, documentos" />
                    </Form.Item>

                    <Form.Item
                        label="Carpeta padre (opcional)"
                        name="parent"
                    >
                        <Select allowClear placeholder="Ninguna (carpeta raíz)">
                            {folders.map(folder => (
                                <Option key={folder.id} value={folder.path}>
                                    <FolderOutlined /> {folder.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Editar Archivo"
                open={editModalVisible}
                onOk={handleEditSubmit}
                onCancel={() => setEditModalVisible(false)}
                width={isMobile ? '100%' : 520}
                centered={isMobile}
            >
                <Form form={editForm} layout="vertical">
                    <Form.Item
                        label="Texto alternativo"
                        name="alt"
                    >
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    <Form.Item
                        label="Descripción"
                        name="description"
                    >
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    <Form.Item
                        label="Carpeta"
                        name="folder"
                    >
                        <Select>
                            <Option value="/">Raíz</Option>
                            {folders.map(folder => (
                                <Option key={folder.id} value={folder.path}>
                                    <FolderOutlined /> {folder.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={currentFile?.originalName}
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={[
                    <Button key="copy" icon={<CopyOutlined />} onClick={() => handleCopyUrl(currentFile?.url)}>
                        Copiar URL
                    </Button>,
                    <Button key="download" icon={<DownloadOutlined />} href={currentFile?.url} download>
                        Descargar
                    </Button>
                ]}
                width={isMobile ? '100%' : 800}
                centered={isMobile}
            >
                {currentFile && (
                    <div>
                        {currentFile.type.startsWith('image/') ? (
                            <Image src={currentFile.url} style={{ width: '100%' }} />
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                {getFileIcon(currentFile.type)}
                                <div style={{ marginTop: 16 }}>
                                    <Tag>{currentFile.type}</Tag>
                                </div>
                                <div style={{ marginTop: 8 }}>
                                    {mediaService.formatFileSize(currentFile.size)}
                                </div>
                            </div>
                        )}
                        <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                            <div><strong>URL:</strong> {currentFile.url}</div>
                            <div><strong>Subido por:</strong> {currentFile.uploadedByName}</div>
                            <div><strong>Fecha:</strong> {new Date(currentFile.uploadedAt).toLocaleString('es-MX')}</div>
                            {currentFile.metadata?.alt && (
                                <div><strong>Alt:</strong> {currentFile.metadata.alt}</div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Media;
