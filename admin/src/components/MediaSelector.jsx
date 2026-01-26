import { useState, useEffect } from 'react';
import { Modal, Button, Row, Col, Card, Image, Empty, Spin, Select, Input, message } from 'antd';
import { FileImageOutlined, FolderOutlined, SearchOutlined } from '@ant-design/icons';
import mediaService from '@services/mediaService';

const { Search } = Input;
const { Option } = Select;

const MediaSelector = ({
    visible,
    onCancel,
    onSelect,
    defaultFolder = null,
    fileType = 'image',
    title = 'Seleccionar Imagen'
}) => {
    const [loading, setLoading] = useState(false);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        if (visible && defaultFolder && folders.length > 0) {
            const folder = folders.find(f =>
                f.name === defaultFolder || f.path === defaultFolder
            );
            if (folder) {
                setSelectedFolder(folder.path);
            }
        }
    }, [visible, defaultFolder, folders]);

    useEffect(() => {
        if (visible) {
            loadFolders();
        }
    }, [visible]);

    useEffect(() => {
        if (visible && folders.length > 0) {
            loadMediaFiles();
        }
    }, [visible, selectedFolder, searchText, folders]);

    const loadMediaFiles = async () => {
        try {
            setLoading(true);
            const filters = {
                folder: selectedFolder,
                type: fileType,
                search: searchText
            };
            const data = await mediaService.getMediaFiles(filters);
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

    const handleSelectFile = (file) => {
        setSelectedFile(file);
    };

    const handleConfirm = () => {
        if (selectedFile) {
            onSelect(selectedFile);
            setSelectedFile(null);
            setSearchText('');
        } else {
            message.warning('Por favor seleccione un archivo');
        }
    };

    const handleCancelInternal = () => {
        setSelectedFile(null);
        setSearchText('');
        onCancel();
    };

    return (
        <Modal
            title={title}
            open={visible}
            onCancel={handleCancelInternal}
            onOk={handleConfirm}
            okText="Seleccionar"
            cancelText="Cancelar"
            width={900}
            okButtonProps={{ disabled: !selectedFile }}
        >
            <div style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col flex="auto">
                        <Search
                            placeholder="Buscar archivos..."
                            allowClear
                            onSearch={setSearchText}
                            prefix={<SearchOutlined />}
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Todas las carpetas"
                            allowClear
                            style={{ width: 200 }}
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
                </Row>
            </div>

            <Spin spinning={loading}>
                {mediaFiles.length === 0 ? (
                    <Empty
                        description={
                            selectedFolder
                                ? `No hay archivos en la carpeta "${selectedFolder}"`
                                : "No hay archivos disponibles"
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ padding: '40px 0' }}
                    />
                ) : (
                    <div style={{ maxHeight: 450, overflowY: 'auto' }}>
                        <Row gutter={[16, 16]}>
                            {mediaFiles.map(file => (
                                <Col key={file.id} xs={12} sm={8} md={6}>
                                    <Card
                                        hoverable
                                        onClick={() => handleSelectFile(file)}
                                        style={{
                                            border: selectedFile?.id === file.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                                            cursor: 'pointer'
                                        }}
                                        cover={
                                            file.type.startsWith('image/') ? (
                                                <div style={{
                                                    height: 120,
                                                    overflow: 'hidden',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: '#f0f0f0'
                                                }}>
                                                    <Image
                                                        src={file.thumbnail}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover'
                                                        }}
                                                        preview={false}
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{
                                                    height: 120,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: '#f0f0f0'
                                                }}>
                                                    <FileImageOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                                                </div>
                                            )
                                        }
                                    >
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
                                                    {mediaService.formatFileSize(file.size)}
                                                </div>
                                            }
                                        />
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>
                )}
            </Spin>

            {selectedFile && (
                <div style={{
                    marginTop: 16,
                    padding: 12,
                    background: '#f0f7ff',
                    border: '1px solid #91d5ff',
                    borderRadius: 4
                }}>
                    <strong>Seleccionado:</strong> {selectedFile.originalName}
                    <br />
                    <small style={{ color: '#8c8c8c' }}>{selectedFile.url}</small>
                </div>
            )}
        </Modal>
    );
};

export default MediaSelector;
