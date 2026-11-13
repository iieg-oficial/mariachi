import { useEffect, useState } from 'react';
import { Button, Empty, Input, Modal, Space, Tooltip, Typography } from 'antd';
import { DeleteOutlined, FolderOpenOutlined, UploadOutlined } from '@ant-design/icons';
import { BucketFilePicker, BucketFileUploader, useAccessibleBuckets } from '@features/acervo';
import { carpetaPorExtension, nombreLegible } from '@features/mapalab-layers/utils/archivosDeMetadato';

const { Text } = Typography;

const PICKER_BUCKETS = ['mapalab', 'iieg'];
const UPLOAD_BUCKETS = ['mapalab'];
const PREFIXES = ['metadata/txt/', 'metadata/xlsx/'];
const ACCEPT = '.txt,.xlsx,.pdf,.csv';
const METADATA_START = { mapalab: 'metadata/' };

export default function ArchivosModal({ open, archivos, onCancel, onApply }) {
    const [lista, setLista] = useState([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [uploaderOpen, setUploaderOpen] = useState(false);
    const { buckets } = useAccessibleBuckets(UPLOAD_BUCKETS);

    useEffect(() => {
        if (open) setLista((archivos || []).map((a) => ({ nombre: a.nombre || '', enlace: a.enlace || '' })));
    }, [open, archivos]);

    const agregar = (file) => setLista((prev) => [...prev, { nombre: nombreLegible(file.nombre), enlace: file.enlace }]);
    const cambiarNombre = (i, nombre) => setLista((prev) => prev.map((a, j) => (j === i ? { ...a, nombre } : a)));
    const quitar = (i) => setLista((prev) => prev.filter((_, j) => j !== i));

    return (
        <Modal
            title="Archivos adjuntos"
            open={open}
            onCancel={onCancel}
            onOk={() => onApply(lista.filter((a) => a.enlace || a.nombre))}
            okText="Aplicar"
            cancelText="Cancelar"
            width={640}
            destroyOnHidden
        >
            <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                {lista.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin archivos" />}
                {lista.map((a, i) => (
                    <Space.Compact key={`${a.enlace}-${i}`} style={{ display: 'flex' }}>
                        <Input
                            value={a.nombre}
                            placeholder="Nombre mostrado"
                            onChange={(e) => cambiarNombre(i, e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <Tooltip title={a.enlace}>
                            <Text ellipsis style={{ flex: 1, alignSelf: 'center', padding: '0 8px', maxWidth: 260 }} type="secondary">
                                {a.enlace}
                            </Text>
                        </Tooltip>
                        <Button danger icon={<DeleteOutlined />} aria-label="Quitar archivo" onClick={() => quitar(i)} />
                    </Space.Compact>
                ))}
                <Space.Compact block>
                    <Button type="dashed" icon={<FolderOpenOutlined />} onClick={() => setPickerOpen(true)} style={{ flex: 1 }}>
                        Elegir del bucket
                    </Button>
                    <Button
                        type="dashed"
                        icon={<UploadOutlined />}
                        onClick={() => setUploaderOpen(true)}
                        disabled={!buckets[0]?.id}
                        style={{ flex: 1 }}
                    >
                        Subir archivo nuevo
                    </Button>
                </Space.Compact>
            </Space>
            <BucketFilePicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={agregar}
                bucketSlugs={PICKER_BUCKETS}
                prefixes={PREFIXES}
                title="Elegir archivo"
                uploadAccept={ACCEPT}
                uploadFolderFor={carpetaPorExtension}
                startPaths={METADATA_START}
            />
            <BucketFileUploader
                open={uploaderOpen}
                onClose={() => setUploaderOpen(false)}
                onUploaded={agregar}
                bucketId={buckets[0]?.id ?? null}
                prefixes={PREFIXES}
                title="Subir archivo al bucket mapalab"
                accept={ACCEPT}
                folderFor={carpetaPorExtension}
            />
        </Modal>
    );
}
