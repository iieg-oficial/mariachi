import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, List, Modal, Progress, Space, Tag, Typography, Upload } from 'antd';
import { DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import { uploadGeoserverFileSmart } from '@features/mapalab-geoserver-files/api/geoserverFilesService';
import { message } from '@shared/services/message';

const { Dragger } = Upload;
const { Text } = Typography;

const FILE_BASENAME_RE = /^[a-zA-Z0-9._-]+\.(svg|png|jpg|jpeg|webp|gif|tiff|tif)$/i;
const MAX_BYTES = 200 * 1024 * 1024;

const toSafeName = (raw) =>
    (raw || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9._-]/g, '');

const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / 1024 ** i) * 10) / 10} ${units[i]}`;
};

const describe = (file) => {
    const safe = toSafeName(file.name);
    if (file.size > MAX_BYTES) {
        return { safe, valid: false, reason: 'Excede el límite de 200 MB' };
    }
    if (!FILE_BASENAME_RE.test(safe)) {
        return { safe, valid: false, reason: 'Nombre o extensión no soportados' };
    }
    return { safe, valid: true, reason: null };
};


export default function FileUploadModal({ open, currentPath, workspace, destinationLabel, onClose, onUploaded }) {
    const [entries, setEntries] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setEntries([]);
            setSubmitting(false);
        }
    }, [open]);

    const draggerProps = {
        multiple: true,
        accept: '.svg,.png,.jpg,.jpeg,.webp,.gif,.tiff,.tif',
        showUploadList: false,
        beforeUpload: (file) => {
            const meta = describe(file);
            setEntries((prev) => {
                if (prev.some((e) => e.uid === file.uid)) return prev;
                return [...prev, { uid: file.uid, file, ...meta, status: 'queued', percent: 0 }];
            });
            return false;
        },
    };

    const removeEntry = (uid) =>
        setEntries((prev) => prev.filter((e) => e.uid !== uid));

    const patchEntry = (uid, patch) =>
        setEntries((prev) => prev.map((e) => (e.uid === uid ? { ...e, ...patch } : e)));

    const pending = useMemo(() => entries.filter((e) => e.valid && e.status !== 'done'), [entries]);

    const handleOk = async () => {
        if (!pending.length) {
            message.error('Selecciona al menos un archivo válido');
            return;
        }
        setSubmitting(true);
        const uploaded = [];
        for (const entry of pending) {
            patchEntry(entry.uid, { status: 'uploading', percent: 0, reason: null });
            const fullName = currentPath ? `${currentPath}/${entry.safe}` : entry.safe;
            try {
                const result = await uploadGeoserverFileSmart({
                    file: entry.file,
                    name: fullName,
                    workspace,
                    onProgress: (p) => patchEntry(entry.uid, { percent: p }),
                });
                patchEntry(entry.uid, { status: 'done', percent: 100 });
                uploaded.push(result);
            } catch (err) {
                patchEntry(entry.uid, {
                    status: 'error',
                    reason: err?.response?.data?.detail || 'Error al subir',
                });
            }
        }
        setSubmitting(false);

        if (uploaded.length) {
            message.success(`Subido(s): ${uploaded.length} archivo(s)`);
            onUploaded?.(uploaded);
        }
        const remaining = uploaded.length !== pending.length;
        if (!remaining) onClose?.();
    };

    const statusTag = (entry) => {
        if (entry.status === 'done') return <Tag color="green">Listo</Tag>;
        if (entry.status === 'error') return <Tag color="red">Error</Tag>;
        if (entry.status === 'uploading') return <Tag color="blue">Subiendo…</Tag>;
        if (!entry.valid) return <Tag color="red">Inválido</Tag>;
        return <Tag>En cola</Tag>;
    };

    return (
        <Modal
            open={open}
            title="Subir archivos a GeoServer"
            onCancel={onClose}
            onOk={handleOk}
            okText={pending.length > 1 ? `Subir ${pending.length} archivos` : 'Subir'}
            cancelText="Cerrar"
            confirmLoading={submitting}
            okButtonProps={{ disabled: !pending.length }}
            width={620}
            destroyOnHidden
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Alert
                    type="info"
                    showIcon
                    message={
                        <span>
                            Destino:{' '}
                            <Tag color="gold" style={{ marginInlineStart: 4 }}>
                                {destinationLabel || 'styles/'}{currentPath ? currentPath + '/' : ''}
                            </Tag>
                        </span>
                    }
                    description="El nombre se normaliza automáticamente. Para cambiar carpeta o ámbito, cierra y navega primero."
                />

                <Dragger {...draggerProps} style={{ padding: 8 }} disabled={submitting}>
                    <p style={{ marginBottom: 8 }}><InboxOutlined style={{ fontSize: 28 }} /></p>
                    <p>Click o arrastra uno o varios archivos</p>
                    <p style={{ fontSize: 11, color: '#888' }}>
                        SVG, PNG, JPG, WebP, GIF, TIFF · máx 200 MB · archivos grandes se suben por partes
                    </p>
                </Dragger>

                {entries.length > 0 && (
                    <List
                        size="small"
                        bordered
                        dataSource={entries}
                        renderItem={(entry) => (
                            <List.Item
                                actions={[
                                    <Button
                                        key="rm"
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        disabled={submitting && entry.status === 'uploading'}
                                        onClick={() => removeEntry(entry.uid)}
                                    />,
                                ]}
                            >
                                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                    <Space size={8} style={{ width: '100%', justifyContent: 'space-between' }}>
                                        <Text ellipsis style={{ maxWidth: 360 }}>{entry.safe || entry.file.name}</Text>
                                        <Space size={4}>
                                            <Text type="secondary" style={{ fontSize: 11 }}>{formatSize(entry.file.size)}</Text>
                                            {statusTag(entry)}
                                        </Space>
                                    </Space>
                                    {entry.status === 'uploading' && (
                                        <Progress percent={entry.percent} size="small" />
                                    )}
                                    {entry.reason && (
                                        <Text type="danger" style={{ fontSize: 11 }}>{entry.reason}</Text>
                                    )}
                                </Space>
                            </List.Item>
                        )}
                    />
                )}
            </Space>
        </Modal>
    );
}
