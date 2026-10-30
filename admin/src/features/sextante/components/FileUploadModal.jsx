import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Modal, Space, Tag, Tooltip, Typography, Upload, theme } from 'antd';
import { CloudUploadOutlined, FolderAddOutlined, InboxOutlined, InfoCircleOutlined } from '@ant-design/icons';
import UploadQueueList from '@features/sextante/components/UploadQueueList';
import { useUploadQueue } from '@features/sextante/hooks/useUploadQueue';
import { UPLOADABLE_EXT } from '@features/sextante/utils/geoserverFiles';
import {
    clearFinishedUploads,
    enqueueUploads,
    isActiveUpload,
    removeUpload,
    retryUpload,
    summarizeUploads,
} from '@features/sextante/utils/uploadQueue';
import { describeFile, filesFromDataTransfer, joinPath } from '@features/sextante/utils/uploadEntries';

const { Dragger } = Upload;
const { Text } = Typography;
const { useToken } = theme;

const AYUDA = 'Los nombres se normalizan a minúsculas, sin acentos ni espacios, y las carpetas conservan '
    + 'su estructura. La subida sigue aunque cierres esta ventana o cambies de página.';
const ICON_MUTED = { color: 'rgba(0, 0, 0, 0.45)', fontSize: 14, cursor: 'help' };

const hasFiles = (event) => [...(event.dataTransfer?.types || [])].includes('Files');

export default function FileUploadModal({
    open,
    currentPath,
    workspace,
    destinationLabel,
    onClose,
    onNewFolder,
    title = 'Subir a',
    extensions = UPLOADABLE_EXT,
    hint,
}) {
    const { token } = useToken();
    const [staged, setStaged] = useState([]);
    const [dragging, setDragging] = useState(false);
    const depth = useRef(0);
    const seq = useRef(0);
    const queue = useUploadQueue();
    const summary = summarizeUploads(queue);
    const destination = `${destinationLabel || 'styles/'}${currentPath ? `${currentPath}/` : ''}`;

    useEffect(() => {
        if (open) return;
        setStaged([]);
        setDragging(false);
        depth.current = 0;
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const block = (event) => event.preventDefault();
        window.addEventListener('dragover', block);
        window.addEventListener('drop', block);
        return () => {
            window.removeEventListener('dragover', block);
            window.removeEventListener('drop', block);
        };
    }, [open]);

    const addFiles = (list) => setStaged((prev) => {
        const known = new Set(prev.map((entry) => entry.label));
        const next = [...prev];
        for (const { file, relativePath } of list) {
            const meta = describeFile(file, relativePath, extensions);
            const label = meta.safe || file.name;
            if (known.has(label)) continue;
            known.add(label);
            seq.current += 1;
            next.push({
                uid: seq.current,
                file,
                label,
                size: file.size,
                valid: meta.valid,
                reason: meta.reason,
                status: meta.valid ? 'staged' : 'skipped',
            });
        }
        return next;
    });

    const pick = (file) => {
        addFiles([{ file, relativePath: file.name }]);
        return Upload.LIST_IGNORE;
    };

    const ready = useMemo(() => staged.filter((entry) => entry.valid), [staged]);
    const skipped = staged.length - ready.length;

    const submit = () => {
        enqueueUploads(ready.map((entry) => ({
            file: entry.file,
            size: entry.size,
            name: joinPath(currentPath, entry.label),
            workspace,
            label: `${destination}${entry.label}`,
        })));
        setStaged([]);
    };

    const dropHandlers = {
        onDragEnter: (event) => {
            if (!hasFiles(event)) return;
            depth.current += 1;
            setDragging(true);
        },
        onDragLeave: () => {
            depth.current = Math.max(0, depth.current - 1);
            if (!depth.current) setDragging(false);
        },
        onDragOverCapture: (event) => {
            event.preventDefault();
            event.stopPropagation();
        },
        onDropCapture: (event) => {
            event.preventDefault();
            event.stopPropagation();
            depth.current = 0;
            setDragging(false);
            filesFromDataTransfer(event.dataTransfer).then(addFiles);
        },
    };

    const overlay = dragging && (
        <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: token.borderRadiusLG,
            border: `2px dashed ${token.colorPrimary}`,
            background: 'rgba(255, 255, 255, 0.94)',
        }}>
            <CloudUploadOutlined style={{ fontSize: 36, color: token.colorPrimary }} />
            <Text strong>Suelta archivos o carpetas</Text>
            <Text type="secondary">en {destination}</Text>
        </div>
    );

    const footer = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {onNewFolder && (
                <Button shape="round" icon={<FolderAddOutlined />} onClick={onNewFolder}>Nueva carpeta</Button>
            )}
            <Text type="secondary" style={{ flex: 1, textAlign: 'left', fontSize: 12 }}>
                {staged.length > 0 && `${ready.length} por subir${skipped ? ` · ${skipped} omitido(s)` : ''}`}
            </Text>
            <Button shape="round" onClick={onClose}>{summary.active ? 'Segundo plano' : 'Cerrar'}</Button>
            <Button shape="round" type="primary" disabled={!ready.length} onClick={submit}>
                {ready.length > 1 ? `Subir ${ready.length} archivos` : 'Subir'}
            </Button>
        </div>
    );

    return (
        <Modal
            open={open}
            title={(
                <Space size={8}>
                    <Tooltip
                        title={`${hint || `${extensions.join(', ').toUpperCase()} · sin límite de tamaño`}. ${AYUDA}`}
                        styles={{ root: { maxWidth: 360 } }}
                    >
                        <InfoCircleOutlined tabIndex={0} aria-label="Qué se puede subir" style={ICON_MUTED} />
                    </Tooltip>
                    {title}
                    <Tag color="gold">{destination}</Tag>
                </Space>
            )}
            onCancel={onClose}
            footer={footer}
            width={620}
            destroyOnHidden
            modalRender={(node) => (
                <div style={{ position: 'relative' }} {...dropHandlers}>
                    {node}
                    {overlay}
                </div>
            )}
        >
            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                <Dragger
                    multiple
                    showUploadList={false}
                    accept={extensions.map((e) => `.${e}`).join(',')}
                    beforeUpload={pick}
                >
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined style={{ fontSize: 32, color: '#5C2472' }} />
                    </p>
                    <p className="ant-upload-text">Click o arrastra archivos y carpetas</p>
                </Dragger>

                <UploadQueueList
                    items={staged}
                    onRemove={(entry) => setStaged((prev) => prev.filter((e) => e.uid !== entry.uid))}
                />

                {queue.length > 0 && (
                    <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Text strong style={{ flex: 1 }}>
                                {summary.active
                                    ? `Subiendo ${summary.position} de ${summary.total}`
                                    : `${summary.done} subido(s)`}
                                {summary.failed > 0 && <Text type="danger">{` · ${summary.failed} con error`}</Text>}
                            </Text>
                            {queue.some((item) => !isActiveUpload(item)) && (
                                <Button type="link" size="small" onClick={clearFinishedUploads}>
                                    Limpiar terminados
                                </Button>
                            )}
                        </div>
                        <UploadQueueList
                            items={queue}
                            onRetry={(item) => retryUpload(item.id)}
                            onRemove={(item) => removeUpload(item.id)}
                        />
                    </Space>
                )}
            </Space>
        </Modal>
    );
}
