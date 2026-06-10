import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Card, Button, Upload, Table, Image, Space, Modal, Form, Input, Select, Tabs, Tag, Popconfirm, Row, Col, Statistic, Segmented, Empty, Spin, Breadcrumb, Progress, Descriptions } from 'antd';
import {
    InboxOutlined, DeleteOutlined, EditOutlined, FolderOutlined, FolderOpenOutlined, FolderAddOutlined, FileImageOutlined, FilePdfOutlined,
    FileOutlined, AppstoreOutlined, BarsOutlined, DownloadOutlined, CopyOutlined, EyeOutlined, HomeOutlined, DragOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import acervoService from '@features/acervo/api/acervoService';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Dragger } = Upload;
const { Search } = Input;
const { Option } = Select;

const isDocumentType = (type) => {
    if (!type) return false;
    if (type.startsWith('image/')) return false;
    const docPrefixes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats',
        'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
        'application/json', 'application/xml', 'application/geo+json',
        'text/'];
    return docPrefixes.some((p) => type.startsWith(p));
};

const renderTypeTag = (type, isDir) => {
    if (isDir) return <Tag color="orange">CARPETA</Tag>;
    if (!type) return <Tag>—</Tag>;
    let color = 'default';
    if (type.startsWith('image/')) color = 'blue';
    if (type === 'application/pdf') color = 'red';
    const label = type.split('/')[1]?.toUpperCase() || type.toUpperCase();
    return <Tag color={color}>{label}</Tag>;
};

const Acervo = () => {
    const { isMobile } = useIsMobile();
    const [loading, setLoading] = useState(true);
    const [buckets, setBuckets] = useState([]);
    const [selectedBucketId, setSelectedBucketId] = useState(null);
    const [acervoFiles, setAcervoFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [bucketStats, setBucketStats] = useState({ total: 0, images: 0, documents: 0, totalSize: 0 });
    const [currentPath, setCurrentPath] = useState('');
    const [selectedType, setSelectedType] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [folderModalVisible, setFolderModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [moveModalVisible, setMoveModalVisible] = useState(false);
    const [moveTargetFolder, setMoveTargetFolder] = useState('/');
    const [currentFile, setCurrentFile] = useState(null);
    const [folderInfo, setFolderInfo] = useState(null);
    const [folderInfoLoading, setFolderInfoLoading] = useState(false);
    const [form] = Form.useForm();
    const [folderForm] = Form.useForm();
    const [editForm] = Form.useForm();

    const uploadSemaphore = useRef({ active: 0, queue: [], max: 3 });
    const uploadBatch = useRef({ pending: 0, done: 0, failed: 0, lastError: null });

    const acquireSlot = () => new Promise((resolve) => {
        const sem = uploadSemaphore.current;
        if (sem.active < sem.max) {
            sem.active++;
            resolve();
        } else {
            sem.queue.push(resolve);
        }
    });

    const releaseSlot = () => {
        const sem = uploadSemaphore.current;
        const next = sem.queue.shift();
        if (next) next();
        else sem.active--;
    };

    const loadFolders = useCallback(async (bucketId) => {
        try {
            const data = await acervoService.getFolders(bucketId);
            setFolders(data);
        } catch {
            message.error('Error al cargar carpetas');
        }
    }, []);

    const loadAcervoFiles = useCallback(async () => {
        if (!selectedBucketId) return;
        setLoading(true);
        try {
            const data = await acervoService.getAcervoFiles({
                bucketId: selectedBucketId,
                folder: currentPath,
                type: selectedType,
                search: searchText,
                recursive: Boolean(searchText),
            });
            setAcervoFiles(data);
        } catch {
            message.error('Error al cargar archivos');
        } finally {
            setLoading(false);
        }
    }, [selectedBucketId, currentPath, selectedType, searchText]);

    const loadBucketStats = useCallback(async () => {
        if (!selectedBucketId) return;
        try {
            const data = await acervoService.getAcervoFiles({
                bucketId: selectedBucketId,
                recursive: true,
            });
            const files = (data || []).filter(f => !f.isDir);
            setBucketStats({
                total: files.length,
                images: files.filter(f => f.type?.startsWith('image/')).length,
                documents: files.filter(f => isDocumentType(f.type)).length,
                totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
            });
        } catch {
            /* stats no críticas */
        }
    }, [selectedBucketId]);

    useEffect(() => {
        let cancelled = false;
        acervoService.getBuckets()
            .then((bucketsData) => {
                if (cancelled) return;
                setBuckets(bucketsData);
                if (bucketsData.length > 0) {
                    setSelectedBucketId((prev) => {
                        if (prev != null) return prev;
                        try {
                            const saved = Number(localStorage.getItem('mariachi.acervo.lastBucketId'));
                            const match = saved && bucketsData.find((b) => b.id === saved);
                            if (match) return match.id;
                        } catch { /* noop */ }
                        const mapalab = bucketsData.find((b) => b.acervo_bucket === 'mapalab');
                        return (mapalab || bucketsData[0]).id;
                    });
                }
            })
            .catch(() => message.error('Error al cargar buckets'));
        return () => { cancelled = true; };
    }, []);

    const handleBucketChange = useCallback((nextId) => {
        const id = Number(nextId);
        setSelectedBucketId(id);
        setCurrentPath('');
        try { localStorage.setItem('mariachi.acervo.lastBucketId', String(id)); } catch { /* noop */ }
    }, []);

    useEffect(() => {
        if (!selectedBucketId) return;
        loadFolders(selectedBucketId);
        loadBucketStats();
    }, [selectedBucketId, loadFolders, loadBucketStats]);

    useEffect(() => {
        loadAcervoFiles();
    }, [loadAcervoFiles]);

    const visibleAcervoFiles = selectedBucketId ? acervoFiles : [];

    const finishUpload = () => {
        const batch = uploadBatch.current;
        batch.pending -= 1;
        if (batch.pending > 0) return;
        const { done, failed, lastError } = batch;
        batch.done = 0;
        batch.failed = 0;
        batch.lastError = null;
        setTimeout(() => {
            if (done > 0) message.success(`${done} archivo(s) subido(s) exitosamente`);
            if (failed > 0) {
                message.error(`${failed} archivo(s) no se pudieron subir${lastError ? ` — ${lastError}` : ''}`);
            }
            setUploadProgress(null);
            loadAcervoFiles();
            loadBucketStats();
        }, 0);
    };

    const startUpload = async (file) => {
        uploadBatch.current.pending += 1;
        setUploadProgress((prev) => ({
            total: (prev?.total || 0) + 1,
            done: prev?.done || 0,
            failed: prev?.failed || 0,
        }));
        await acquireSlot();
        try {
            let attempts = 0;
            for (;;) {
                try {
                    await acervoService.uploadAcervoFile(file, {
                        bucketId: selectedBucketId,
                        folder: form.getFieldValue('folder') || '/',
                        alt: form.getFieldValue('alt') || '',
                    });
                    uploadBatch.current.done += 1;
                    setUploadProgress((prev) => prev && { ...prev, done: prev.done + 1 });
                    break;
                } catch (error) {
                    attempts += 1;
                    if (error?.response?.status === 429 && attempts <= 5) {
                        const retryAfter = Number(error.response.headers?.['retry-after']) || 5;
                        await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
                        continue;
                    }
                    uploadBatch.current.failed += 1;
                    const detail = error?.response?.data?.detail;
                    if (detail) uploadBatch.current.lastError = detail;
                    setUploadProgress((prev) => prev && { ...prev, failed: prev.failed + 1 });
                    break;
                }
            }
        } finally {
            releaseSlot();
            finishUpload();
        }
    };

    const handleBeforeUpload = (file) => {
        if (!selectedBucketId) {
            message.error('Selecciona un bucket primero');
            return Upload.LIST_IGNORE;
        }
        startUpload(file);
        return Upload.LIST_IGNORE;
    };

    const handleDelete = async (id) => {
        try {
            await acervoService.deleteAcervoFile(id);
            const idStr = String(id);
            if (idStr.startsWith('dir:')) {
                message.success('Carpeta eliminada');
                const name = idStr.split(':').slice(2).join(':');
                const prefix = name.endsWith('/') ? name : `${name}/`;
                if (currentPath && currentPath.startsWith(prefix)) {
                    setCurrentPath(prefix.replace(/[^/]+\/$/, ''));
                }
            } else {
                message.success('Archivo eliminado exitosamente');
            }
            loadAcervoFiles();
            loadBucketStats();
            loadFolders(selectedBucketId);
        } catch (error) {
            message.error(error?.response?.data?.detail || 'Error al eliminar');
        }
    };

    const handleDeleteMultiple = async () => {
        if (selectedFiles.length === 0) {
            message.warning('Seleccione al menos un archivo');
            return;
        }

        try {
            await acervoService.deleteMultipleFiles(selectedFiles);
            message.success(`${selectedFiles.length} archivos eliminados`);
            setSelectedFiles([]);
            loadAcervoFiles();
            loadBucketStats();
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
            await acervoService.updateAcervoFile(currentFile.id, values);
            message.success('Archivo actualizado exitosamente');
            setEditModalVisible(false);
            loadAcervoFiles();
        } catch {
            message.error('Error al actualizar archivo');
        }
    };

    const handleCreateFolder = async () => {
        try {
            const values = await folderForm.validateFields();
            await acervoService.createFolder(selectedBucketId, values.name, values.parent);
            message.success('Carpeta creada exitosamente');
            setFolderModalVisible(false);
            folderForm.resetFields();
            loadFolders(selectedBucketId);
            loadAcervoFiles();
        } catch (error) {
            message.error(error?.response?.data?.detail || 'Error al crear carpeta');
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

    const handleOpenMove = (file) => {
        setCurrentFile(file);
        setMoveTargetFolder(file.folder || '/');
        setMoveModalVisible(true);
    };

    const handleMoveSubmit = async () => {
        if (!currentFile) return;
        try {
            await acervoService.moveAcervoFile(currentFile.id, moveTargetFolder);
            message.success('Archivo movido');
            setMoveModalVisible(false);
            loadAcervoFiles();
            loadFolders(selectedBucketId);
        } catch (error) {
            message.error(error?.response?.data?.detail || 'Error al mover archivo');
        }
    };

    const handleEnterDir = (file) => {
        const cleanName = file.name.endsWith('/') ? file.name : `${file.name}/`;
        setCurrentPath(cleanName);
        setSelectedFiles([]);
    };

    const handleDownloadFolder = (folder) => {
        const prefix = (folder.name || '').replace(/\/$/, '');
        const url = acervoService.buildFolderZipUrl(selectedBucketId, prefix);
        window.open(url, '_blank');
    };

    const handleFolderInfo = async (folder) => {
        const prefix = (folder.name || '').replace(/\/$/, '');
        setFolderInfo({ name: prefix.split('/').pop(), prefix });
        setFolderInfoLoading(true);
        try {
            const data = await acervoService.getFolderInfo(selectedBucketId, prefix);
            setFolderInfo((prev) => prev && { ...prev, ...data });
        } catch {
            message.error('Error al obtener información de la carpeta');
            setFolderInfo(null);
        } finally {
            setFolderInfoLoading(false);
        }
    };

    const currentBucket = buckets.find((b) => b.id === selectedBucketId);

    const breadcrumbItems = (() => {
        const linkStyle = {
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'inherit',
            font: 'inherit',
        };
        const items = [{
            title: (
                <button type="button" style={linkStyle} onClick={() => setCurrentPath('')}>
                    <HomeOutlined /> {currentBucket?.display_name || 'Raíz'}
                </button>
            ),
        }];
        if (currentPath) {
            const parts = currentPath.replace(/\/$/, '').split('/');
            let acc = '';
            parts.forEach((p, i) => {
                acc += `${p}/`;
                const path = acc;
                items.push({
                    title: i === parts.length - 1 ? p : (
                        <button type="button" style={linkStyle} onClick={() => setCurrentPath(path)}>{p}</button>
                    ),
                });
            });
        }
        return items;
    })();

    const getFileIcon = (type) => {
        if (type?.startsWith('image/')) return <FileImageOutlined style={{ fontSize: 48, color: '#1890ff' }} />;
        if (type === 'application/pdf') return <FilePdfOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />;
        return <FileOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />;
    };

    const columns = [
        {
            title: 'Previsualización',
            dataIndex: 'thumbnail',
            key: 'thumbnail',
            width: 100,
            render: (thumbnail, record) => {
                if (record.isDir) {
                    return (
                        <button
                            type="button"
                            onClick={() => handleEnterDir(record)}
                            style={{
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                width: '100%',
                            }}
                        >
                            <FolderOutlined style={{ fontSize: 36, color: '#FF8300' }} />
                        </button>
                    );
                }
                return record.type?.startsWith('image/') ? (
                    <Image
                        src={thumbnail}
                        width={60}
                        height={60}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                        preview={false}
                        loading="lazy"
                        onClick={() => handlePreview(record)}
                    />
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        {getFileIcon(record.type)}
                    </div>
                );
            }
        },
        {
            title: 'Nombre',
            dataIndex: 'originalName',
            key: 'originalName',
            sorter: (a, b) => {
                if (a.isDir && !b.isDir) return -1;
                if (!a.isDir && b.isDir) return 1;
                return a.originalName.localeCompare(b.originalName);
            },
            render: (text, record) => {
                const content = (
                    <>
                        <div style={{ fontWeight: 500, color: record.isDir ? '#5C2472' : undefined }}>
                            {record.isDir ? `📁 ${text}` : text}
                        </div>
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.name}</div>
                    </>
                );
                if (!record.isDir) return <div>{content}</div>;
                return (
                    <button
                        type="button"
                        onClick={() => handleEnterDir(record)}
                        style={{
                            cursor: 'pointer',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            textAlign: 'left',
                            width: '100%',
                            font: 'inherit',
                            color: 'inherit',
                        }}
                    >
                        {content}
                    </button>
                );
            }
        },
        {
            title: 'Tipo',
            dataIndex: 'type',
            key: 'type',
            width: 150,
            render: (type, record) => renderTypeTag(type, record.isDir),
        },
        {
            title: 'Tamaño',
            dataIndex: 'size',
            key: 'size',
            width: 120,
            sorter: (a, b) => (a.size || 0) - (b.size || 0),
            render: (size, record) => record.isDir ? '—' : acervoService.formatFileSize(size)
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
            render: (date) => date ? new Date(date).toLocaleString('es-MX') : '—'
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    {record.isDir && (
                        <Button
                            type="text"
                            icon={<InfoCircleOutlined />}
                            title="Información de la carpeta"
                            onClick={() => handleFolderInfo(record)}
                        />
                    )}
                    {!record.isDir && (
                        <>
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
                        </>
                    )}
                    <Popconfirm
                        title={record.isDir ? '¿Eliminar carpeta y todo su contenido?' : '¿Eliminar este archivo?'}
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

    const sortedFiles = [...visibleAcervoFiles].sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return (a.originalName || '').localeCompare(b.originalName || '');
    });

    const renderGridView = () => (
        <Row gutter={[16, 16]}>
            {sortedFiles.map(file => (
                <Col key={file.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card
                        hoverable
                        onClick={file.isDir ? () => handleEnterDir(file) : () => handlePreview(file)}
                        cover={
                            file.isDir ? (
                                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF2E5', cursor: 'pointer' }}>
                                    <FolderOutlined style={{ fontSize: 80, color: '#FF8300' }} />
                                </div>
                            ) : file.type?.startsWith('image/') ? (
                                <div style={{ height: 200, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                                    <Image
                                        src={file.thumbnail}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        preview={false}
                                        loading="lazy"
                                    />
                                </div>
                            ) : (
                                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>
                                    {getFileIcon(file.type)}
                                </div>
                            )
                        }
                        actions={file.isDir ? [
                            <FolderOpenOutlined key="open" onClick={(e) => { e.stopPropagation(); handleEnterDir(file); }} />,
                            <InfoCircleOutlined key="info" title="Información de la carpeta" onClick={(e) => { e.stopPropagation(); handleFolderInfo(file); }} />,
                            <DownloadOutlined key="download" title="Descargar ZIP" onClick={(e) => { e.stopPropagation(); handleDownloadFolder(file); }} />,
                            <Popconfirm
                                key="delete"
                                title="¿Eliminar carpeta y todo su contenido?"
                                onConfirm={(e) => { e?.stopPropagation?.(); handleDelete(file.id); }}
                                onCancel={(e) => e?.stopPropagation?.()}
                                okText="Sí"
                                cancelText="No"
                            >
                                <DeleteOutlined onClick={(e) => e.stopPropagation()} />
                            </Popconfirm>,
                        ] : [
                            <DragOutlined key="move" title="Mover a carpeta" onClick={(e) => { e.stopPropagation(); handleOpenMove(file); }} />,
                            <CopyOutlined key="copy" onClick={(e) => { e.stopPropagation(); handleCopyUrl(file.url); }} />,
                            <EditOutlined key="edit" onClick={(e) => { e.stopPropagation(); handleEdit(file); }} />,
                            <Popconfirm
                                key="delete"
                                title="¿Eliminar?"
                                onConfirm={(e) => { e?.stopPropagation?.(); handleDelete(file.id); }}
                                onCancel={(e) => e?.stopPropagation?.()}
                                okText="Sí"
                                cancelText="No"
                            >
                                <DeleteOutlined onClick={(e) => e.stopPropagation()} />
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
                                    <div>{file.isDir ? 'Carpeta' : acervoService.formatFileSize(file.size)}</div>
                                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                                        {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString('es-MX') : '—'}
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
                title="Acervo"
                extra={
                    <Space wrap size={[8, 8]} style={{ width: isMobile ? '100%' : 'auto' }}>
                        <Button
                            type="primary"
                            icon={<InboxOutlined />}
                            onClick={() => {
                                form.setFieldsValue({ folder: currentPath || '/' });
                                setUploadModalVisible(true);
                            }}
                            disabled={!selectedBucketId}
                            block={isMobile}
                        >
                            Subir Archivos
                        </Button>
                        <Button
                            icon={<FolderAddOutlined />}
                            onClick={() => {
                                folderForm.setFieldsValue({ parent: currentPath || undefined });
                                setFolderModalVisible(true);
                            }}
                            disabled={!selectedBucketId}
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
                        <Statistic title="Total de archivos (bucket)" value={bucketStats.total} />
                    </Col>
                    <Col xs={12} sm={12} md={6}>
                        <Statistic title="Imágenes" value={bucketStats.images} prefix={<FileImageOutlined />} />
                    </Col>
                    <Col xs={12} sm={12} md={6}>
                        <Statistic title="Documentos" value={bucketStats.documents} prefix={<FilePdfOutlined />} />
                    </Col>
                    <Col xs={12} sm={12} md={6}>
                        <Statistic
                            title="Tamaño total"
                            value={acervoService.formatFileSize(bucketStats.totalSize)}
                        />
                    </Col>
                </Row>

                {currentBucket?.acervo_bucket === 'iieg' && (
                    <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message="Convención del bucket IIEG"
                        description={
                            <span>
                                Este bucket es <strong>global y compartido</strong> entre secciones. Los iconos reutilizables (avisos, marcadores, etc.) viven en
                                {' '}<code>iconos/</code>. Si subes un icono, hazlo dentro de esa carpeta para evitar duplicación.
                            </span>
                        }
                    />
                )}

                <div style={{ marginBottom: 12 }}>
                    <Breadcrumb items={breadcrumbItems} />
                </div>

                {buckets.length > 0 && (
                    <Tabs
                        activeKey={selectedBucketId != null ? String(selectedBucketId) : undefined}
                        onChange={handleBucketChange}
                        size="small"
                        tabBarStyle={{ marginBottom: 12 }}
                        items={buckets.map((b) => ({
                            key: String(b.id),
                            label: b.display_name,
                        }))}
                    />
                )}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 16
                }}>
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
                    {visibleAcervoFiles.length === 0 ? (
                        <Empty description="No hay archivos" />
                    ) : viewMode === 'grid' ? (
                        renderGridView()
                    ) : (
                        <Table
                            columns={columns}
                            dataSource={sortedFiles}
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
                    {currentBucket && (
                        <Form.Item label="Bucket">
                            <Input value={currentBucket.display_name} disabled />
                        </Form.Item>
                    )}
                    <Form.Item
                        label="Carpeta de destino"
                        name="folder"
                        initialValue="/"
                        extra="Ruta dentro del bucket. Edita si quieres subir a otra carpeta."
                    >
                        <Input placeholder="/" prefix={<FolderOutlined />} />
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
                            beforeUpload={handleBeforeUpload}
                            showUploadList={false}
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

                    {uploadProgress && (
                        <Form.Item>
                            <Progress
                                percent={Math.round(((uploadProgress.done + uploadProgress.failed) / uploadProgress.total) * 100)}
                                status={uploadProgress.failed > 0 ? 'exception' : 'active'}
                            />
                            <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 12 }}>
                                {uploadProgress.done + uploadProgress.failed} de {uploadProgress.total} archivo(s)
                                {uploadProgress.failed > 0 ? ` (${uploadProgress.failed} con error)` : ''}
                            </div>
                        </Form.Item>
                    )}
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
                    {currentBucket && (
                        <Form.Item label="Bucket">
                            <Input value={currentBucket.display_name} disabled />
                        </Form.Item>
                    )}
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
                        extra="Ruta dentro del bucket donde se creará la nueva carpeta."
                    >
                        <Input allowClear placeholder="Ninguna (carpeta raíz)" prefix={<FolderOutlined />} />
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
                title="Mover a carpeta"
                open={moveModalVisible}
                onCancel={() => setMoveModalVisible(false)}
                onOk={handleMoveSubmit}
                okText="Mover"
                cancelText="Cancelar"
                destroyOnHidden
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                        Archivo: <strong>{currentFile?.originalName}</strong>
                        <br />
                        Ubicación actual: <code>{currentFile?.folder || '/'}</code>
                    </div>
                    <Select
                        value={moveTargetFolder}
                        onChange={setMoveTargetFolder}
                        style={{ width: '100%' }}
                        showSearch
                        placeholder="Selecciona carpeta destino"
                        options={[
                            { value: '/', label: '/ (raíz del bucket)' },
                            ...folders.map((f) => ({ value: f.path, label: f.path })),
                        ]}
                    />
                </Space>
            </Modal>

            <Modal
                title={`Carpeta: ${folderInfo?.name || ''}`}
                open={Boolean(folderInfo)}
                onCancel={() => setFolderInfo(null)}
                footer={[
                    <Button key="close" onClick={() => setFolderInfo(null)}>Cerrar</Button>
                ]}
                width={isMobile ? '100%' : 480}
                centered={isMobile}
            >
                <Spin spinning={folderInfoLoading}>
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Ruta">
                            <code>{folderInfo?.prefix || '/'}</code>
                        </Descriptions.Item>
                        <Descriptions.Item label="Archivos">
                            {folderInfo?.fileCount ?? '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Imágenes">
                            {folderInfo?.imageCount ?? '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Subcarpetas">
                            {folderInfo?.subfolderCount ?? '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Peso total">
                            {folderInfo?.totalSize != null ? acervoService.formatFileSize(folderInfo.totalSize) : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Última modificación">
                            {folderInfo?.lastModified ? new Date(folderInfo.lastModified).toLocaleString('es-MX') : '—'}
                        </Descriptions.Item>
                    </Descriptions>
                </Spin>
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
                        {currentFile.type?.startsWith('image/') ? (
                            <Image src={currentFile.url} style={{ width: '100%' }} />
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40 }}>
                                {getFileIcon(currentFile.type)}
                                <div style={{ marginTop: 16 }}>
                                    <Tag>{currentFile.type}</Tag>
                                </div>
                                <div style={{ marginTop: 8 }}>
                                    {acervoService.formatFileSize(currentFile.size)}
                                </div>
                            </div>
                        )}
                        <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                            <div><strong>URL:</strong> {currentFile.url}</div>
                            <div><strong>Subido por:</strong> {currentFile.uploadedByName}</div>
                            <div><strong>Fecha:</strong> {currentFile.uploadedAt ? new Date(currentFile.uploadedAt).toLocaleString('es-MX') : '—'}</div>
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

export default Acervo;
