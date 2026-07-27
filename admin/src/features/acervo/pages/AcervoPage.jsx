import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Card, Button, Upload, Table, Image, Space, Modal, Form, Input, Select, Tabs, Tag, Popconfirm, Row, Col, Segmented, Empty, Spin, Breadcrumb, Progress, Descriptions, Checkbox, Tooltip, List, Radio, Typography } from 'antd';
import {
    InboxOutlined, DeleteOutlined, EditOutlined, FolderOutlined, FolderOpenOutlined, FolderAddOutlined, FileImageOutlined, FilePdfOutlined,
    FileOutlined, AppstoreOutlined, BarsOutlined, DownloadOutlined, CopyOutlined, EyeOutlined, HomeOutlined, DragOutlined,
    InfoCircleOutlined, CodeOutlined, BookOutlined, PictureOutlined, PieChartOutlined
} from '@ant-design/icons';
import acervoService from '@features/acervo/api/acervoService';
import AcervoSectionHeader from '@features/acervo/components/AcervoSectionHeader';
import AcervoStatsModal from '@features/acervo/components/AcervoStatsModal';
import FileSnippetsModal from '@features/acervo/components/FileSnippetsModal';
import FileSnippets from '@features/acervo/components/FileSnippets';
import AcervoHelpModal from '@features/documentacion/components/AcervoHelpModal';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Dragger } = Upload;
const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

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
    const [bucketStats, setBucketStats] = useState(null);
    const [statsModalOpen, setStatsModalOpen] = useState(false);
    const [currentPath, setCurrentPath] = useState('');
    const [selectedType, setSelectedType] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [uploadResult, setUploadResult] = useState(null);
    const [folderModalVisible, setFolderModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [moveModalVisible, setMoveModalVisible] = useState(false);
    const [moveTargetFolder, setMoveTargetFolder] = useState('/');
    const [bulkMoveModalVisible, setBulkMoveModalVisible] = useState(false);
    const [bulkMoveTargetFolder, setBulkMoveTargetFolder] = useState('/');
    const [currentFile, setCurrentFile] = useState(null);
    const [snippetsFile, setSnippetsFile] = useState(null);
    const [helpTab, setHelpTab] = useState(null);

    const openHelp = (tab) => {
        setSnippetsFile(null);
        setHelpTab(tab);
    };
    const [folderInfo, setFolderInfo] = useState(null);
    const [folderInfoLoading, setFolderInfoLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [dndUnsupported, setDndUnsupported] = useState(() => {
        try { return localStorage.getItem('mariachi.acervo.dndUnsupported') === '1'; } catch { return false; }
    });
    const dragCounter = useRef(0);
    const [form] = Form.useForm();
    const [folderForm] = Form.useForm();
    const [editForm] = Form.useForm();

    const MAX_FILE_SIZE = 500 * 1024 * 1024;

    const currentBucket = buckets.find((b) => b.id === selectedBucketId);
    const bucketProtegido = !!currentBucket?.protegido;

    useEffect(() => {
        const preventDefaults = (e) => { e.preventDefault(); };
        window.addEventListener('dragover', preventDefaults);
        window.addEventListener('drop', preventDefaults);
        return () => {
            window.removeEventListener('dragover', preventDefaults);
            window.removeEventListener('drop', preventDefaults);
        };
    }, []);

    const uploadSemaphore = useRef({ active: 0, queue: [], max: 3 });
    const uploadBatch = useRef({ pending: 0, done: 0, failed: 0, conflicts: 0, lastError: null });
    const finalizeTimer = useRef(null);
    const conflictFilesRef = useRef([]);
    const [conflictModal, setConflictModal] = useState({ open: false, items: [] });

    const currentUploadOptions = () => ({
        alt: form.getFieldValue('alt') || '',
        useUuid: Boolean(form.getFieldValue('useUuid')),
        onConflict: 'reject',
    });

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
            const data = await acervoService.getAcervoResumen(selectedBucketId);
            setBucketStats(data?.buckets?.[0] || null);
        } catch {
            setBucketStats(null);
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
        setBucketStats(null);
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

    const finalizeBatch = async () => {
        const batch = uploadBatch.current;
        const { done, failed, lastError } = batch;
        const conflictItems = conflictFilesRef.current;
        conflictFilesRef.current = [];
        batch.done = 0;
        batch.failed = 0;
        batch.conflicts = 0;
        batch.lastError = null;
        if (done > 0) message.success(`${done} archivo(s) subido(s) exitosamente`);
        if (failed > 0) {
            message.error(`${failed} archivo(s) no se pudieron subir${lastError ? ` — ${lastError}` : ''}`);
        }
        setUploadProgress(null);
        setUploadResult({ done, failed, conflicts: conflictItems.length, lastError });
        await loadAcervoFiles();
        loadBucketStats();
        if (conflictItems.length > 0) {
            setConflictModal({
                open: true,
                items: conflictItems.map((c, i) => ({ ...c, id: i, action: 'rename' })),
            });
        }
    };

    // El cierre del lote se difiere brevemente: la programacion de subidas
    // (lectura de buffers en drag & drop, microtasks de antd) puede dejar el
    // contador en 0 momentaneamente entre oleadas. Esperar a que se estabilice
    // garantiza un unico refresco del listado al terminar de verdad.
    const finishUpload = () => {
        const batch = uploadBatch.current;
        batch.pending -= 1;
        if (batch.pending > 0) return;
        if (finalizeTimer.current) clearTimeout(finalizeTimer.current);
        finalizeTimer.current = setTimeout(() => {
            finalizeTimer.current = null;
            if (uploadBatch.current.pending > 0) return;
            finalizeBatch();
        }, 200);
    };

    const handleConflictActionChange = (id, action) => {
        setConflictModal((prev) => ({
            ...prev,
            items: prev.items.map((it) => (it.id === id ? { ...it, action } : it)),
        }));
    };

    const handleConflictAll = (action) => {
        setConflictModal((prev) => ({
            ...prev,
            items: prev.items.map((it) => ({ ...it, action })),
        }));
    };

    const handleResolveConflicts = () => {
        const toRename = conflictModal.items.filter((it) => it.action === 'rename');
        setConflictModal({ open: false, items: [] });
        toRename.forEach((it) => {
            startUpload(it.file, it.folder, { alt: it.alt, useUuid: it.useUuid, onConflict: 'rename' });
        });
    };

    const CHUNK_SIZE = 50 * 1024 * 1024;

    const startChunkedUpload = async (file, folder, opts = {}) => {
        const uploadOpts = { alt: '', useUuid: false, onConflict: 'reject', ...opts };
        if (uploadBatch.current.pending === 0) setUploadResult(null);
        uploadBatch.current.pending += 1;
        setUploadProgress((prev) => ({
            total: (prev?.total || 0) + 1,
            done: prev?.done || 0,
            failed: prev?.failed || 0,
            conflicts: prev?.conflicts || 0,
        }));
        await acquireSlot();
        try {
            const init = await acervoService.initChunkedUpload(file.name, file.type, file.size, {
                bucketId: selectedBucketId,
                folder: folder || '/',
                alt: uploadOpts.alt,
                useUuid: uploadOpts.useUuid,
                onConflict: uploadOpts.onConflict,
            });
            const { session_id } = init;
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
            for (let i = 0; i < totalChunks; i++) {
                const start = i * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunkBlob = file.slice(start, end);
                let attempts = 0;
                for (;;) {
                    try {
                        await acervoService.uploadChunk(session_id, i + 1, chunkBlob);
                        setUploadProgress((prev) => prev && {
                            ...prev,
                            chunkInfo: `${file.name}: parte ${i + 1}/${totalChunks}`,
                        });
                        break;
                    } catch (error) {
                        attempts += 1;
                        if (error?.response?.status === 429 && attempts <= 5) {
                            const retryAfter = Number(error.response.headers?.['retry-after']) || 5;
                            await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
                            continue;
                        }
                        throw error;
                    }
                }
            }
            await acervoService.completeChunkedUpload(session_id);
            uploadBatch.current.done += 1;
            setUploadProgress((prev) => prev && { ...prev, done: prev.done + 1, chunkInfo: null });
        } catch (error) {
            if (error?.response?.status === 409 && uploadOpts.onConflict !== 'rename') {
                uploadBatch.current.conflicts += 1;
                conflictFilesRef.current.push({
                    file, folder, alt: uploadOpts.alt, useUuid: uploadOpts.useUuid, name: file.name,
                });
                setUploadProgress((prev) => prev && { ...prev, conflicts: (prev.conflicts || 0) + 1, chunkInfo: null });
            } else {
                uploadBatch.current.failed += 1;
                const detail = error?.response?.data?.detail;
                if (detail) uploadBatch.current.lastError = detail;
                setUploadProgress((prev) => prev && { ...prev, failed: prev.failed + 1, chunkInfo: null });
            }
        } finally {
            releaseSlot();
            finishUpload();
        }
    };

    const startUpload = async (file, folder, opts = {}) => {
        const uploadOpts = { alt: '', useUuid: false, onConflict: 'reject', ...opts };
        if (file.size > MAX_FILE_SIZE) {
            startChunkedUpload(file, folder, uploadOpts);
            return;
        }
        if (uploadBatch.current.pending === 0) setUploadResult(null);
        uploadBatch.current.pending += 1;
        setUploadProgress((prev) => ({
            total: (prev?.total || 0) + 1,
            done: prev?.done || 0,
            failed: prev?.failed || 0,
            conflicts: prev?.conflicts || 0,
        }));
        await acquireSlot();
        try {
            let attempts = 0;
            for (;;) {
                try {
                    await acervoService.uploadAcervoFile(file, {
                        bucketId: selectedBucketId,
                        folder: folder || '/',
                        alt: uploadOpts.alt,
                        useUuid: uploadOpts.useUuid,
                        onConflict: uploadOpts.onConflict,
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
                    if (error?.response?.status === 409 && uploadOpts.onConflict !== 'rename') {
                        uploadBatch.current.conflicts += 1;
                        conflictFilesRef.current.push({
                            file, folder, alt: uploadOpts.alt, useUuid: uploadOpts.useUuid, name: file.name,
                        });
                        setUploadProgress((prev) => prev && { ...prev, conflicts: (prev.conflicts || 0) + 1 });
                        break;
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
        startUpload(file, form.getFieldValue('folder') || '/', currentUploadOptions());
        return Upload.LIST_IGNORE;
    };

    const STABILIZE_MAX_BYTES = 100 * 1024 * 1024;

    // Los File de un drag & drop en Linux (document portal / GVFS) pueden
    // apuntar a un temporal que caduca en segundos: Chrome lanza
    // net::ERR_FILE_NOT_FOUND al serializar el FormData. Se leen los bytes
    // de inmediato y se reconstruye el archivo en memoria.
    const setDndSupport = (unsupported) => {
        setDndUnsupported(unsupported);
        try { localStorage.setItem('mariachi.acervo.dndUnsupported', unsupported ? '1' : '0'); } catch { /* noop */ }
    };

    const stabilizeAndUpload = async (files, folder) => {
        const unreadable = [];
        const opts = currentUploadOptions();
        // Se leen primero todos los buffers; recien al final se encolan las
        // subidas en un solo paso sincrono para que el contador del lote no
        // toque 0 entre archivo y archivo (lo que dispararia un refresco
        // prematuro y un cierre de lote anticipado).
        const ready = await Promise.all(files.map(async (file) => {
            if (file.size > STABILIZE_MAX_BYTES) return file;
            try {
                const buffer = await file.arrayBuffer();
                return new File([buffer], file.name, {
                    type: file.type,
                    lastModified: file.lastModified,
                });
            } catch {
                unreadable.push(file.name);
                return null;
            }
        }));
        const readableFiles = ready.filter(Boolean);
        readableFiles.forEach((f) => startUpload(f, folder, opts));
        const readable = readableFiles.length;
        if (readable > 0 && dndUnsupported) {
            setDndSupport(false);
        }
        if (unreadable.length === files.length) {
            setDndSupport(true);
            message.error(
                'Este navegador no entrega los archivos arrastrados (sandbox, p. ej. instalado como snap). '
                + 'La zona de arrastre se deshabilitó; usa el botón Subir.'
            );
            return;
        }
        if (unreadable.length > 0) {
            const muestra = unreadable.slice(0, 3).join(', ');
            message.error(
                `No se pudieron leer ${unreadable.length} archivo(s) del arrastre (${muestra}${unreadable.length > 3 ? '…' : ''}). `
                + 'El origen no entrega archivos persistentes; usa el botón Subir.'
            );
        }
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        if (dndUnsupported) return;
        const types = e.dataTransfer?.types || [];
        if (types.length === 0 || types.every((t) => t === 'text/plain' || t === 'text/uri-list' || t === 'text/html')) return;
        dragCounter.current += 1;
        setDragActive(true);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        dragCounter.current = Math.max(0, dragCounter.current - 1);
        if (dragCounter.current === 0) setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        dragCounter.current = 0;
        setDragActive(false);
        if (bucketProtegido) {
            message.warning('Este bucket está protegido: su contenido lo gestiona la aplicación que lo usa.');
            return;
        }
        const dt = e.dataTransfer;
        let files = [];
        if (dt?.files && dt.files.length > 0) {
            files = Array.from(dt.files);
        } else if (dt?.items && dt.items.length > 0) {
            files = Array.from(dt.items)
                .filter((item) => item.kind === 'file')
                .map((item) => item.getAsFile())
                .filter(Boolean);
        }
        if (files.length === 0) {
            const types = Array.from(dt?.types || []);
            if (types.length > 0) {
                console.warn('[acervo] drop sin archivos; dataTransfer.types =', types);
                message.warning('El origen del arrastre no entregó archivos. Si vienen de un ZIP, extráelos primero, o usa el botón Subir.');
            }
            return;
        }
        if (!selectedBucketId) {
            message.error('Selecciona un bucket primero');
            return;
        }
        stabilizeAndUpload(files, currentPath || '/');
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
        const absolute = acervoService.toPublicUrl(url);
        navigator.clipboard.writeText(absolute);
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

    const handleBulkMoveSubmit = async () => {
        try {
            const result = await acervoService.moveMultipleFiles(selectedFiles, bulkMoveTargetFolder);
            if (result.movidos > 0) {
                message.success(`${result.movidos} archivo(s) movido(s)`);
            }
            if (result.fallos > 0) {
                const muestra = result.errores.slice(0, 3).join(', ');
                message.warning(`${result.fallos} archivo(s) no se pudieron mover${muestra ? `: ${muestra}` : ''}`);
            }
            setSelectedFiles([]);
            setBulkMoveModalVisible(false);
            loadAcervoFiles();
            loadFolders(selectedBucketId);
        } catch (error) {
            message.error(error?.response?.data?.detail || 'Error al mover archivos');
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
                        src={acervoService.thumbVariant(record, 120)}
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
                        <Tooltip title="Ver información de la carpeta (archivos, peso, subcarpetas)">
                            <Button
                                type="text"
                                icon={<InfoCircleOutlined />}
                                onClick={() => handleFolderInfo(record)}
                            />
                        </Tooltip>
                    )}
                    {!record.isDir && (
                        <>
                            <Tooltip title="Previsualizar el archivo">
                                <Button
                                    type="text"
                                    icon={<EyeOutlined />}
                                    onClick={() => handlePreview(record)}
                                />
                            </Tooltip>
                            <Tooltip title="Copiar la URL pública (con dominio) al portapapeles">
                                <Button
                                    type="text"
                                    icon={<CopyOutlined />}
                                    onClick={() => handleCopyUrl(record.url)}
                                />
                            </Tooltip>
                            {!bucketProtegido && (
                                <Tooltip title="Editar texto alternativo, descripción y carpeta">
                                    <Button
                                        type="text"
                                        icon={<EditOutlined />}
                                        onClick={() => handleEdit(record)}
                                    />
                                </Tooltip>
                            )}
                        </>
                    )}
                    {!bucketProtegido && (
                        <Popconfirm
                            title={record.isDir ? '¿Eliminar carpeta y todo su contenido?' : '¿Eliminar este archivo?'}
                            onConfirm={() => handleDelete(record.id)}
                            okText="Sí"
                            cancelText="No"
                        >
                            <Tooltip title={record.isDir ? 'Eliminar la carpeta y su contenido' : 'Eliminar el archivo'}>
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                />
                            </Tooltip>
                        </Popconfirm>
                    )}
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
            {sortedFiles.map(file => {
                const isSelected = selectedFiles.includes(file.id);
                return (
                    <Col key={file.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                        <Card
                            hoverable
                            style={isSelected ? { outline: '2px solid #5C2472', outlineOffset: -2 } : undefined}
                            onClick={(e) => {
                                if (e.target.closest?.('.ant-checkbox-wrapper')) return;
                                if (file.isDir) handleEnterDir(file);
                                else handlePreview(file);
                            }}
                            cover={
                                <div style={{ position: 'relative' }}>
                                    <Checkbox
                                        checked={isSelected}
                                        onChange={() => {
                                            setSelectedFiles(prev =>
                                                prev.includes(file.id)
                                                    ? prev.filter(id => id !== file.id)
                                                    : [...prev, file.id]
                                            );
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: 4,
                                            left: 4,
                                            zIndex: 2,
                                        }}
                                    />
                                    {!file.isDir && file.type?.startsWith('image/') && (
                                        <Tooltip title="Generar snippets de código para incrustar esta imagen">
                                            <Button
                                                size="small"
                                                icon={<CodeOutlined />}
                                                onClick={(e) => { e.stopPropagation(); setSnippetsFile(file); }}
                                                style={{
                                                    position: 'absolute',
                                                    top: 4,
                                                    right: 4,
                                                    zIndex: 2,
                                                    background: 'rgba(255, 255, 255, 0.85)',
                                                }}
                                            />
                                        </Tooltip>
                                    )}
                                    {file.isDir ? (
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
                                    )}
                                </div>
                            }
                            actions={file.isDir ? [
                                <Tooltip key="open" title="Abrir la carpeta">
                                    <FolderOpenOutlined onClick={(e) => { e.stopPropagation(); handleEnterDir(file); }} />
                                </Tooltip>,
                                <Tooltip key="info" title="Ver información de la carpeta (archivos, peso, subcarpetas)">
                                    <InfoCircleOutlined onClick={(e) => { e.stopPropagation(); handleFolderInfo(file); }} />
                                </Tooltip>,
                                <Tooltip key="download" title="Descargar la carpeta completa como ZIP">
                                    <DownloadOutlined onClick={(e) => { e.stopPropagation(); handleDownloadFolder(file); }} />
                                </Tooltip>,
                                <Popconfirm
                                    key="delete"
                                    title="¿Eliminar carpeta y todo su contenido?"
                                    onConfirm={(e) => { e?.stopPropagation?.(); handleDelete(file.id); }}
                                    onCancel={(e) => e?.stopPropagation?.()}
                                    okText="Sí"
                                    cancelText="No"
                                >
                                    <Tooltip title="Eliminar la carpeta y su contenido">
                                        <DeleteOutlined onClick={(e) => e.stopPropagation()} />
                                    </Tooltip>
                                </Popconfirm>,
                            ] : [
                                <Tooltip key="move" title="Mover a otra carpeta">
                                    <DragOutlined onClick={(e) => { e.stopPropagation(); handleOpenMove(file); }} />
                                </Tooltip>,
                                <Tooltip key="copy" title="Copiar la URL pública (con dominio) al portapapeles">
                                    <CopyOutlined onClick={(e) => { e.stopPropagation(); handleCopyUrl(file.url); }} />
                                </Tooltip>,
                                <Tooltip key="edit" title="Editar texto alternativo, descripción y carpeta">
                                    <EditOutlined onClick={(e) => { e.stopPropagation(); handleEdit(file); }} />
                                </Tooltip>,
                                <Popconfirm
                                    key="delete"
                                    title="¿Eliminar?"
                                    onConfirm={(e) => { e?.stopPropagation?.(); handleDelete(file.id); }}
                                    onCancel={(e) => e?.stopPropagation?.()}
                                    okText="Sí"
                                    cancelText="No"
                                >
                                    <Tooltip title="Eliminar el archivo">
                                        <DeleteOutlined onClick={(e) => e.stopPropagation()} />
                                    </Tooltip>
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
                );
            })}
        </Row>
    );

    const crearActions = bucketProtegido ? null : (
        <Space wrap size={[8, 8]} style={{ width: isMobile ? '100%' : 'auto' }}>
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
        </Space>
    );

    const mediaActions = (
        <Space wrap size={[8, 8]} style={{ width: isMobile ? '100%' : 'auto' }}>
            {!bucketProtegido && selectedFiles.length > 0 && (
                <>
                    <Button
                        icon={<DragOutlined />}
                        onClick={() => {
                            setBulkMoveTargetFolder('/');
                            setBulkMoveModalVisible(true);
                        }}
                        block={isMobile}
                    >
                        Mover ({selectedFiles.length})
                    </Button>
                    <Popconfirm
                        title={`¿Eliminar ${selectedFiles.length} archivos?`}
                        onConfirm={handleDeleteMultiple}
                        okText="Sí"
                        cancelText="No"
                    >
                        <Button danger icon={<DeleteOutlined />} block={isMobile}>
                            Eliminar ({selectedFiles.length})
                        </Button>
                    </Popconfirm>
                </>
            )}
        </Space>
    );

    return (
        <div>
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 16,
            }}>
                <AcervoSectionHeader
                    icon={<PictureOutlined />}
                    title="Media"
                    description="Sube, organiza y consulta los archivos del Acervo por bucket y carpeta."
                />
                <Space>
                    <Tooltip title="Ver información general del Acervo">
                        <Button
                            icon={<PieChartOutlined />}
                            aria-label="Información general del Acervo"
                            onClick={() => setStatsModalOpen(true)}
                        />
                    </Tooltip>
                    <Tooltip title="Abrir la guía de uso del Acervo">
                        <Button icon={<BookOutlined />} onClick={() => openHelp('uso')}>
                            {isMobile ? '' : 'Documentación'}
                        </Button>
                    </Tooltip>
                </Space>
            </div>
            <Card>
                <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column-reverse' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: 8,
                    marginBottom: 12,
                }}>
                    <Breadcrumb items={breadcrumbItems} />
                    {mediaActions}
                </div>

                {buckets.length > 0 && (
                    <Tabs
                        activeKey={selectedBucketId != null ? String(selectedBucketId) : undefined}
                        onChange={handleBucketChange}
                        size="small"
                        tabBarStyle={{ marginBottom: 4 }}
                        items={buckets.map((b) => ({
                            key: String(b.id),
                            label: b.display_name,
                        }))}
                    />
                )}
                {bucketStats && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                        {bucketStats.fileCount} archivos · {bucketStats.imageCount} imágenes
                        {' '}· {bucketStats.documentCount} documentos · {bucketStats.folderCount} carpetas
                        {' '}· {acervoService.formatFileSize(bucketStats.totalSize || 0)}
                    </Text>
                )}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 16,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        alignItems: 'center',
                        flex: '1 1 auto',
                        minWidth: 0,
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
                    <div style={{ flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
                        {crearActions}
                    </div>
                </div>

                {bucketProtegido && (
                    <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message="Bucket protegido: solo lectura"
                        description={
                            `El contenido de «${currentBucket?.displayName || currentBucket?.acervoBucket}» `
                            + 'lo gestiona la aplicación que lo usa y sus rutas están referenciadas desde la '
                            + 'base de datos. Borrar, mover o renombrar aquí dejaría registros apuntando a '
                            + 'archivos inexistentes, así que esas acciones están deshabilitadas.'
                        }
                    />
                )}

                {uploadProgress && !uploadModalVisible && (
                    <div style={{ marginBottom: 12 }}>
                        <Progress
                            percent={Math.round(((uploadProgress.done + uploadProgress.failed + (uploadProgress.conflicts || 0)) / uploadProgress.total) * 100)}
                            status={uploadProgress.failed > 0 ? 'exception' : 'active'}
                        />
                        <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 12 }}>
                            Subiendo {uploadProgress.done + uploadProgress.failed + (uploadProgress.conflicts || 0)} de {uploadProgress.total} archivo(s)
                            {uploadProgress.failed > 0 ? ` (${uploadProgress.failed} con error)` : ''}
                            {uploadProgress.conflicts > 0 ? ` (${uploadProgress.conflicts} en conflicto)` : ''}
                            {uploadProgress.chunkInfo ? ` — ${uploadProgress.chunkInfo}` : ''}
                        </div>
                    </div>
                )}

                <div
                    data-testid="acervo-drop-zone"
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{ position: 'relative', minHeight: 200 }}
                >
                    {dragActive && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 10,
                                background: 'rgba(92, 36, 114, 0.08)',
                                border: '2px dashed #5C2472',
                                borderRadius: 8,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                pointerEvents: 'none',
                            }}
                        >
                            <InboxOutlined style={{ fontSize: 40, color: '#5C2472' }} />
                            <span style={{ fontSize: 16, fontWeight: 600, color: '#5C2472' }}>
                                Suelta para subir a {currentPath ? `"${currentPath.replace(/\/$/, '')}"` : 'la raíz'}
                            </span>
                        </div>
                    )}
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
                                expandable={{
                                    rowExpandable: (record) => record.type?.startsWith('image/'),
                                    expandedRowRender: (record) => <FileSnippets file={record} onHelp={() => openHelp('thumbs')} />,
                                    expandIcon: ({ expanded, onExpand, record }) => (
                                        record.type?.startsWith('image/') ? (
                                            <Tooltip title="Ver snippets de código para incrustar esta imagen">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<CodeOutlined />}
                                                    style={{ color: expanded ? '#1890ff' : undefined }}
                                                    onClick={(e) => onExpand(record, e)}
                                                />
                                            </Tooltip>
                                        ) : null
                                    ),
                                }}
                                scroll={{ x: 'max-content' }}
                                pagination={{ simple: isMobile }}
                            />
                        )}
                    </Spin>
                </div>
            </Card>

            <Modal
                title="Subir Archivos"
                open={uploadModalVisible}
                onCancel={() => {
                    setUploadModalVisible(false);
                    setUploadResult(null);
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

                    <Form.Item name="useUuid" valuePropName="checked" initialValue={false} style={{ marginBottom: 8 }}>
                        <Checkbox>
                            Usar identificador único (UUID) en vez del nombre del archivo
                            <Tooltip
                                title="Por defecto la ruta conserva el nombre del archivo (más legible). Activa esta opción para generar un nombre aleatorio: evita problemas de caché del navegador cuando se reemplaza el archivo y no expone el nombre real en la URL pública."
                            >
                                <InfoCircleOutlined style={{ marginLeft: 6, color: '#8c8c8c' }} />
                            </Tooltip>
                        </Checkbox>
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
                                percent={Math.round(((uploadProgress.done + uploadProgress.failed + (uploadProgress.conflicts || 0)) / uploadProgress.total) * 100)}
                                status={uploadProgress.failed > 0 ? 'exception' : 'active'}
                            />
                            <div style={{ textAlign: 'center', color: '#8c8c8c', fontSize: 12 }}>
                                {uploadProgress.done + uploadProgress.failed + (uploadProgress.conflicts || 0)} de {uploadProgress.total} archivo(s)
                                {uploadProgress.failed > 0 ? ` (${uploadProgress.failed} con error)` : ''}
                                {uploadProgress.conflicts > 0 ? ` (${uploadProgress.conflicts} en conflicto)` : ''}
                                {uploadProgress.chunkInfo ? ` — ${uploadProgress.chunkInfo}` : ''}
                            </div>
                        </Form.Item>
                    )}

                    {uploadResult && !uploadProgress && (
                        <Form.Item>
                            <Alert
                                type={uploadResult.failed > 0 || uploadResult.conflicts > 0 ? 'warning' : 'success'}
                                showIcon
                                closable
                                onClose={() => setUploadResult(null)}
                                message={uploadResult.failed > 0 || uploadResult.conflicts > 0
                                    ? `${uploadResult.done} archivo(s) subido(s)`
                                        + `${uploadResult.failed > 0 ? `, ${uploadResult.failed} con error` : ''}`
                                        + `${uploadResult.conflicts > 0 ? `, ${uploadResult.conflicts} en conflicto de nombre` : ''}`
                                    : `¡Listo! ${uploadResult.done} archivo(s) subido(s) correctamente`}
                                description={uploadResult.failed > 0 ? uploadResult.lastError : undefined}
                                action={
                                    <Button
                                        size="small"
                                        type="primary"
                                        onClick={() => {
                                            setUploadModalVisible(false);
                                            setUploadResult(null);
                                            form.resetFields();
                                        }}
                                    >
                                        Ver archivos
                                    </Button>
                                }
                            />
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
                title={`Mover ${selectedFiles.length} archivo(s)`}
                open={bulkMoveModalVisible}
                onCancel={() => setBulkMoveModalVisible(false)}
                onOk={handleBulkMoveSubmit}
                okText="Mover"
                cancelText="Cancelar"
                destroyOnHidden
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 8 }}>
                        Se moverán {selectedFiles.length} archivo(s) a la carpeta seleccionada.
                    </div>
                    <Select
                        value={bulkMoveTargetFolder}
                        onChange={setBulkMoveTargetFolder}
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

            <FileSnippetsModal
                file={snippetsFile}
                open={!!snippetsFile}
                onClose={() => setSnippetsFile(null)}
                onHelp={() => openHelp('thumbs')}
            />

            <AcervoHelpModal
                open={!!helpTab}
                tab={helpTab || 'uso'}
                onClose={() => setHelpTab(null)}
            />

            <AcervoStatsModal
                open={statsModalOpen}
                onClose={() => setStatsModalOpen(false)}
                isMobile={isMobile}
            />

            <Modal
                title={currentFile?.originalName}
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={[
                    currentFile?.type?.startsWith('image/') && !currentFile?.type?.includes('svg') && (
                        <Button key="original" icon={<EyeOutlined />} href={acervoService.toPublicUrl(currentFile?.url)} target="_blank" rel="noreferrer">
                            Ver original
                        </Button>
                    ),
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
                            <Image src={acervoService.thumbVariant(currentFile, 1280)} style={{ width: '100%' }} />
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
                            <div style={{ wordBreak: 'break-all' }}><strong>URL:</strong> {acervoService.toPublicUrl(currentFile.url)}</div>
                            <div><strong>Subido por:</strong> {currentFile.uploadedByName}</div>
                            <div><strong>Fecha:</strong> {currentFile.uploadedAt ? new Date(currentFile.uploadedAt).toLocaleString('es-MX') : '—'}</div>
                            {currentFile.metadata?.alt && (
                                <div><strong>Alt:</strong> {currentFile.metadata.alt}</div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                title="Conflictos de nombre"
                open={conflictModal.open}
                onCancel={() => setConflictModal({ open: false, items: [] })}
                footer={[
                    <Button key="cancel" onClick={() => setConflictModal({ open: false, items: [] })}>
                        Cancelar
                    </Button>,
                    <Button key="apply" type="primary" onClick={handleResolveConflicts}>
                        Aplicar
                    </Button>,
                ]}
                width={isMobile ? '100%' : 560}
                centered={isMobile}
            >
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 12 }}>
                    Estos archivos ya existen en la carpeta. Elige <strong>Renombrar</strong> (se agrega
                    un número consecutivo, p. ej. <code>nombre-2.ext</code>) u <strong>Omitir</strong> para
                    no subirlos.
                </div>
                <Space style={{ marginBottom: 12 }}>
                    <Button size="small" onClick={() => handleConflictAll('rename')}>Renombrar todos</Button>
                    <Button size="small" onClick={() => handleConflictAll('skip')}>Omitir todos</Button>
                </Space>
                <List
                    size="small"
                    dataSource={conflictModal.items}
                    rowKey="id"
                    renderItem={(item) => (
                        <List.Item
                            actions={[
                                <Radio.Group
                                    key="action"
                                    size="small"
                                    value={item.action}
                                    onChange={(e) => handleConflictActionChange(item.id, e.target.value)}
                                    optionType="button"
                                    buttonStyle="solid"
                                    options={[
                                        { label: 'Renombrar', value: 'rename' },
                                        { label: 'Omitir', value: 'skip' },
                                    ]}
                                />,
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<FileOutlined style={{ fontSize: 20, color: '#8c8c8c' }} />}
                                title={<span style={{ wordBreak: 'break-all' }}>{item.name}</span>}
                                description={item.folder && item.folder !== '/' ? `Carpeta: ${item.folder}` : 'Raíz'}
                            />
                        </List.Item>
                    )}
                />
            </Modal>
        </div>
    );
};

export default Acervo;
