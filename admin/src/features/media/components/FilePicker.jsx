import { useState, useEffect, useCallback } from 'react';
import { Modal, Row, Col, Card, Image, Input, Select, Space, Button, Upload, Spin, Empty, Tag, Tabs } from 'antd';
import { 
    FileImageOutlined, FilePdfOutlined, FileOutlined, InboxOutlined, 
    FolderOutlined, SearchOutlined, CheckCircleFilled
} from '@ant-design/icons';
import mediaService from '@features/media/api/mediaService';
import { message } from '@shared/services/message';

const { Search } = Input;
const { Option } = Select;
const { Dragger } = Upload;
const { TabPane } = Tabs;

const FilePicker = ({
    visible,
    onClose,
    onSelect,
    multiple = false,
    allowedTypes = [], 
    title = 'Seleccionar Archivo'
}) => {
    const [loading, setLoading] = useState(true);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('browse'); 

    const loadMediaFiles = useCallback(async () => {
        try {
            const filters = {
                folder: selectedFolder,
                type: selectedType,
                search: searchText
            };
            let data = await mediaService.getMediaFiles(filters);

            if (allowedTypes.length > 0) {
                data = data.filter(file =>
                    mediaService.validateFileType(file, allowedTypes)
                );
            }

            setMediaFiles(data);
        } catch {
            message.error('Error al cargar archivos');
        } finally {
            setLoading(false);
        }
    }, [selectedFolder, selectedType, searchText, allowedTypes]);

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        const filters = { folder: selectedFolder, type: selectedType, search: searchText };
        Promise.all([mediaService.getMediaFiles(filters), mediaService.getFolders()])
            .then(([files, folderList]) => {
                if (cancelled) return;
                const filtered = allowedTypes.length > 0
                    ? files.filter((f) => mediaService.validateFileType(f, allowedTypes))
                    : files;
                setMediaFiles(filtered);
                setFolders(folderList);
            })
            .catch(() => message.error('Error al cargar archivos'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [visible, selectedFolder, selectedType, searchText, allowedTypes]);

    const handleFileClick = (file) => {
        if (multiple) {
            setSelectedFiles(prev => {
                const exists = prev.find(f => f.id === file.id);
                if (exists) {
                    return prev.filter(f => f.id !== file.id);
                }
                return [...prev, file];
            });
        } else {
            setSelectedFiles([file]);
        }
    };

    const handleConfirm = () => {
        if (selectedFiles.length === 0) {
            message.warning('Por favor seleccione al menos un archivo');
            return;
        }

        onSelect(multiple ? selectedFiles : selectedFiles[0]);
        handleClose();
    };

    const handleClose = () => {
        setSelectedFiles([]);
        setSearchText('');
        setSelectedFolder(null);
        setSelectedType(null);
        setActiveTab('browse');
        onClose();
    };

    const handleUpload = async (options) => {
        const { file, onSuccess, onError } = options;

        try {
            if (allowedTypes.length > 0 && !mediaService.validateFileType({ type: file.type }, allowedTypes)) {
                message.error('Tipo de archivo no permitido');
                onError(new Error('Tipo de archivo no permitido'));
                return;
            }

            const result = await mediaService.uploadMediaFile(file, {
                folder: selectedFolder || '/'
            });

            onSuccess(result);
            message.success(`${file.name} subido exitosamente`);

            await loadMediaFiles();
            setActiveTab('browse');

            setSelectedFiles([result]);
        } catch (error) {
            onError(error);
            message.error(`Error al subir ${file.name}`);
        }
    };

    const getFileIcon = (type) => {
        if (type.startsWith('image/')) return <FileImageOutlined style={{ fontSize: 48, color: '#1890ff' }} />;
        if (type === 'application/pdf') return <FilePdfOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />;
        return <FileOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />;
    };

    const isSelected = (file) => {
        return selectedFiles.some(f => f.id === file.id);
    };

    const renderFileCard = (file) => {
        const selected = isSelected(file);

        return (
            <Col key={file.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                    hoverable
                    onClick={() => handleFileClick(file)}
                    style={{
                        border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
                        position: 'relative'
                    }}
                    cover={
                        file.type.startsWith('image/') ? (
                            <div style={{ height: 150, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                                <Image
                                    src={file.thumbnail}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    preview={false}
                                />
                            </div>
                        ) : (
                            <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                                {getFileIcon(file.type)}
                            </div>
                        )
                    }
                >
                    {selected && (
                        <div style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 1
                        }}>
                            <CheckCircleFilled style={{ fontSize: 24, color: '#1890ff' }} />
                        </div>
                    )}
                    <Card.Meta
                        title={
                            <div style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontSize: 12
                            }}>
                                {file.originalName}
                            </div>
                        }
                        description={
                            <div style={{ fontSize: 11 }}>
                                <div>{mediaService.formatFileSize(file.size)}</div>
                                <Tag size="small" style={{ marginTop: 4 }}>
                                    {file.type.split('/')[1]?.toUpperCase()}
                                </Tag>
                            </div>
                        }
                    />
                </Card>
            </Col>
        );
    };

    return (
        <Modal
            title={title}
            open={visible}
            onCancel={handleClose}
            width={1000}
            footer={[
                <Button key="cancel" onClick={handleClose}>
                    Cancelar
                </Button>,
                <Button
                    key="confirm"
                    type="primary"
                    onClick={handleConfirm}
                    disabled={selectedFiles.length === 0}
                >
                    Seleccionar {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                </Button>
            ]}
        >
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="Buscar Archivos" key="browse">
                    <Space orientation="vertical" style={{ width: '100%', marginBottom: 16 }}>
                        <Row gutter={16}>
                            <Col flex="auto">
                                <Search
                                    placeholder="Buscar archivos..."
                                    allowClear
                                    prefix={<SearchOutlined />}
                                    onSearch={setSearchText}
                                />
                            </Col>
                            <Col>
                                <Select
                                    placeholder="Carpeta"
                                    allowClear
                                    style={{ width: 180 }}
                                    onChange={setSelectedFolder}
                                    value={selectedFolder}
                                >
                                    {folders.map(folder => (
                                        <Option key={folder.id} value={folder.path}>
                                            <FolderOutlined /> {folder.name}
                                        </Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col>
                                <Select
                                    placeholder="Tipo"
                                    allowClear
                                    style={{ width: 130 }}
                                    onChange={setSelectedType}
                                    value={selectedType}
                                >
                                    <Option value="image">Imágenes</Option>
                                    <Option value="application">Documentos</Option>
                                    <Option value="video">Videos</Option>
                                    <Option value="audio">Audio</Option>
                                </Select>
                            </Col>
                        </Row>

                        {allowedTypes.length > 0 && (
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                                Tipos permitidos: {allowedTypes.map(t => t.replace('/*', '/*')).join(', ')}
                            </div>
                        )}

                        {multiple && (
                            <div style={{ fontSize: 12, color: '#1890ff' }}>
                                Modo de selección múltiple activado
                            </div>
                        )}
                    </Space>

                    <div style={{ maxHeight: 400, overflowY: 'auto', padding: '0 4px' }}>
                        <Spin spinning={loading}>
                            {mediaFiles.length === 0 ? (
                                <Empty
                                    description="No hay archivos disponibles"
                                    style={{ padding: '40px 0' }}
                                />
                            ) : (
                                <Row gutter={[16, 16]}>
                                    {mediaFiles.map(renderFileCard)}
                                </Row>
                            )}
                        </Spin>
                    </div>
                </TabPane>

                <TabPane tab="Subir Nuevo" key="upload">
                    <div style={{ padding: '20px 0' }}>
                        <Space orientation="vertical" style={{ width: '100%' }} size="large">
                            <Select
                                placeholder="Seleccionar carpeta de destino"
                                style={{ width: '100%' }}
                                onChange={setSelectedFolder}
                                value={selectedFolder}
                            >
                                <Option value="/">Raíz</Option>
                                {folders.map(folder => (
                                    <Option key={folder.id} value={folder.path}>
                                        <FolderOutlined /> {folder.name}
                                    </Option>
                                ))}
                            </Select>

                            <Dragger
                                name="file"
                                multiple={multiple}
                                customRequest={handleUpload}
                                showUploadList={{
                                    showRemoveIcon: true
                                }}
                                accept={allowedTypes.length > 0 ? allowedTypes.join(',') : undefined}
                            >
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined />
                                </p>
                                <p className="ant-upload-text">
                                    Haz clic o arrastra archivos aquí
                                </p>
                                <p className="ant-upload-hint">
                                    {multiple ? 'Soporta carga múltiple' : 'Solo se permite un archivo'}
                                </p>
                                {allowedTypes.length > 0 && (
                                    <p className="ant-upload-hint" style={{ fontSize: 11 }}>
                                        Tipos: {allowedTypes.join(', ')}
                                    </p>
                                )}
                            </Dragger>
                        </Space>
                    </div>
                </TabPane>
            </Tabs>

            {selectedFiles.length > 0 && (
                <div style={{
                    marginTop: 16,
                    padding: 12,
                    background: '#f0f8ff',
                    borderRadius: 4,
                    border: '1px solid #91d5ff'
                }}>
                    <div style={{ fontWeight: 500, marginBottom: 8 }}>
                        Archivos seleccionados: {selectedFiles.length}
                    </div>
                    <Space wrap>
                        {selectedFiles.map(file => (
                            <Tag
                                key={file.id}
                                closable={multiple}
                                onClose={() => handleFileClick(file)}
                            >
                                {file.originalName}
                            </Tag>
                        ))}
                    </Space>
                </div>
            )}
        </Modal>
    );
};

export default FilePicker;
