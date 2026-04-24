import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Space, Spin, Typography, message } from 'antd';
import { PlusOutlined, MinusCircleOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { BucketFilePicker } from '@features/media';
import api from '@shared/services/api';

const { Text } = Typography;

const MAPALAB_BUCKET_SLUG = 'mapalab';
const MAPALAB_PREFIXES = ['metadata/txt/', 'metadata/xlsx/'];

export default function LayerMetadataSection({ layerKey }) {
    const { getLayerMetadata, updateLayerMetadata } = useLayerTreeAdmin();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerFieldIndex, setPickerFieldIndex] = useState(null);
    const [mapalabBucketId, setMapalabBucketId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        api.get('/media-buckets')
            .then((res) => {
                if (cancelled) return;
                const bucket = res.data.find((b) => b.acervo_bucket === MAPALAB_BUCKET_SLUG);
                if (bucket) setMapalabBucketId(bucket.id);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!layerKey) return;
        let cancelled = false;
        setLoading(true);
        setNotFound(false);
        getLayerMetadata(layerKey)
            .then((data) => {
                if (cancelled) return;
                if (data === null) {
                    setNotFound(true);
                    form.resetFields();
                    return;
                }
                form.setFieldsValue({
                    descripcion: data.descripcion || '',
                    fuentes: data.fuentes || [],
                    metodologia: data.metodologia || [],
                    metadato: data.metadato || [],
                    frecuencia: data.frecuencia || '',
                    fecha_ultima: data.fecha_ultima || '',
                });
            })
            .catch(() => {
                if (!cancelled) message.error('Error cargando metadatos');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [layerKey, form, getLayerMetadata]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await updateLayerMetadata(layerKey, values);
            message.success('Metadatos guardados');
            setNotFound(false);
        } catch (err) {
            const detail = err?.response?.data?.detail;
            message.error(detail || 'Error al guardar metadatos');
        } finally {
            setSaving(false);
        }
    };

    const openPicker = (index) => {
        if (!mapalabBucketId) {
            message.warning('Bucket mapalab no disponible');
            return;
        }
        setPickerFieldIndex(index);
        setPickerOpen(true);
    };

    const onFileSelected = (file) => {
        const current = form.getFieldValue('metadato') || [];
        const next = [...current];
        next[pickerFieldIndex] = { nombre: file.nombre, enlace: file.enlace };
        form.setFieldsValue({ metadato: next });
    };

    if (loading) {
        return <Spin style={{ display: 'block', margin: '24px auto' }} />;
    }

    return (
        <>
            {notFound && (
                <Alert
                    type="info"
                    showIcon
                    message="Esta capa aún no tiene metadatos. Guarda para crearlos."
                    style={{ marginBottom: 12 }}
                />
            )}
            <Form form={form} layout="vertical">
                <Form.Item label="Descripción" name="descripcion">
                    <Input.TextArea rows={3} />
                </Form.Item>

                <Form.Item label="Frecuencia" name="frecuencia">
                    <Input placeholder="p.ej. Anual, Mensual, Irregular" />
                </Form.Item>

                <Form.Item label="Fecha última actualización" name="fecha_ultima">
                    <Input placeholder="p.ej. 2024 o 2024-Q3" />
                </Form.Item>

                <Text strong style={{ display: 'block', marginBottom: 6 }}>Fuentes</Text>
                <Form.List name="fuentes">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name }) => (
                                <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                                    <Form.Item name={name} style={{ marginBottom: 0, flex: 1, minWidth: 320 }}>
                                        <Input placeholder="Nombre o URL de la fuente" />
                                    </Form.Item>
                                    <MinusCircleOutlined onClick={() => remove(name)} />
                                </Space>
                            ))}
                            <Button type="dashed" onClick={() => add('')} icon={<PlusOutlined />} block>
                                Agregar fuente
                            </Button>
                        </>
                    )}
                </Form.List>

                <div style={{ marginTop: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>Metodología</Text>
                    <Form.List name="metodologia">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name }) => (
                                    <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                                        <Form.Item name={name} style={{ marginBottom: 0, flex: 1, minWidth: 320 }}>
                                            <Input placeholder="Paso o referencia metodológica" />
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} />
                                    </Space>
                                ))}
                                <Button type="dashed" onClick={() => add('')} icon={<PlusOutlined />} block>
                                    Agregar paso
                                </Button>
                            </>
                        )}
                    </Form.List>
                </div>

                <div style={{ marginTop: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>Archivos adjuntos (bucket mapalab)</Text>
                    <Form.List name="metadato">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name }, index) => (
                                    <Space.Compact key={key} style={{ display: 'flex', marginBottom: 8, gap: 6 }}>
                                        <Form.Item name={[name, 'nombre']} style={{ marginBottom: 0, flex: 1 }}>
                                            <Input placeholder="Nombre mostrado" />
                                        </Form.Item>
                                        <Form.Item name={[name, 'enlace']} style={{ marginBottom: 0, flex: 2 }}>
                                            <Input placeholder="/metadata/txt/archivo.txt o URL externa" />
                                        </Form.Item>
                                        <Button
                                            icon={<FolderOpenOutlined />}
                                            onClick={() => openPicker(index)}
                                            title="Buscar archivo en bucket mapalab"
                                        />
                                        <Button
                                            danger
                                            icon={<MinusCircleOutlined />}
                                            onClick={() => remove(name)}
                                        />
                                    </Space.Compact>
                                ))}
                                <Button
                                    type="dashed"
                                    onClick={() => add({ nombre: '', enlace: '' })}
                                    icon={<PlusOutlined />}
                                    block
                                >
                                    Agregar archivo
                                </Button>
                            </>
                        )}
                    </Form.List>
                </div>

                <div style={{ marginTop: 20, textAlign: 'right' }}>
                    <Button type="primary" loading={saving} onClick={handleSave}>
                        Guardar metadatos
                    </Button>
                </div>
            </Form>

            <BucketFilePicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={onFileSelected}
                bucketId={mapalabBucketId}
                prefixes={MAPALAB_PREFIXES}
                title="Archivos del bucket mapalab"
            />
        </>
    );
}
