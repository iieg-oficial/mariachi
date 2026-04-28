import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Select, Space, Spin, Typography, message } from 'antd';
import { PlusOutlined, MinusCircleOutlined, FolderOpenOutlined, UploadOutlined } from '@ant-design/icons';
import { Link } from 'react-router';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { BucketFilePicker, BucketFileUploader } from '@features/media';
import LayerStatsSection from '@features/mapalab-layers/components/layersEditor/LayerStatsSection';
import api from '@shared/services/api';

const { Text } = Typography;

const MAPALAB_BUCKET_SLUG = 'mapalab';
const MAPALAB_PREFIXES = ['metadata/txt/', 'metadata/xlsx/'];

const TIPO_MAPA_OPTIONS = [
    { value: 'IIEG', label: 'IIEG' },
    { value: 'INEGI', label: 'INEGI' },
];

const FRECUENCIA_OPTIONS = [
    { value: 'Diaria', label: 'Diaria' },
    { value: 'Semanal', label: 'Semanal' },
    { value: 'Quincenal', label: 'Quincenal' },
    { value: 'Mensual', label: 'Mensual' },
    { value: 'Bimestral', label: 'Bimestral (cada 2 meses)' },
    { value: 'Trimestral', label: 'Trimestral (cada 3 meses)' },
    { value: 'Cuatrimestral', label: 'Cuatrimestral (cada 4 meses)' },
    { value: 'Semestral', label: 'Semestral (cada 6 meses)' },
    { value: 'Anual', label: 'Anual' },
    { value: 'Bianual', label: 'Bianual (cada 2 años)' },
    { value: 'Trienal', label: 'Trienal (cada 3 años)' },
    { value: 'Quinquenal', label: 'Quinquenal (cada 5 años)' },
    { value: 'Decenal', label: 'Decenal (cada 10 años)' },
    { value: 'Continua', label: 'Continua (tiempo real / streaming)' },
    { value: 'Bajo demanda', label: 'Bajo demanda (a petición)' },
    { value: 'No programado', label: 'No programado (irregular)' },
    { value: 'Histórico', label: 'Histórico (sin actualizaciones planeadas)' },
];

const buildFrecuenciaOptions = (currentValue) => {
    const opts = [...FRECUENCIA_OPTIONS];
    if (currentValue && !opts.find((o) => o.value === currentValue)) {
        opts.unshift({ value: currentValue, label: `${currentValue} (valor previo)` });
    }
    return opts;
};

const toArray = (val, fallback) => {
    if (Array.isArray(val)) return val.length ? val : [fallback];
    if (val && typeof val === 'object') return [val];
    return [fallback];
};

const FUENTE_DEFAULT = { corto: '', largo: '', enlace: '', enlace_label: '' };
const META_DEFAULT = { texto: '', archivo_enlace: '' };

export default function LayerMetadataSection({
    layerKey,
    workspace,
    geoserverLayer,
    availableFields,
    derivedFromDescendants = false,
    siblingsSharingCount = 0,
}) {
    const { getLayerMetadata, updateLayerMetadata } = useLayerTreeAdmin();
    const [form] = Form.useForm();
    const watchedFrecuencia = Form.useWatch('frecuencia', form);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerFieldIndex, setPickerFieldIndex] = useState(null);
    const [uploaderOpen, setUploaderOpen] = useState(false);
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

    const [metadata, setMetadata] = useState(null);

    useEffect(() => {
        if (!layerKey) return;
        let cancelled = false;
        setLoading(true);
        getLayerMetadata(layerKey)
            .then((data) => {
                if (cancelled) return;
                if (data === null) {
                    setNotFound(true);
                    setMetadata(null);
                } else {
                    setNotFound(false);
                    setMetadata(data);
                }
            })
            .catch(() => {
                if (!cancelled) message.error('Error cargando metadatos');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [layerKey, getLayerMetadata]);

    useEffect(() => {
        if (loading) return;
        if (!metadata) {
            form.resetFields();
            return;
        }
        const fuentes = toArray(metadata.fuentes, FUENTE_DEFAULT).map((f) => ({
            corto: f.corto || '',
            largo: f.largo || '',
            enlace: f.enlace || '',
            enlace_label: f.enlace_label ?? f.enlaceLabel ?? '',
        }));
        const metodologia = toArray(metadata.metodologia, META_DEFAULT).map((m) => ({
            texto: m.texto || '',
            archivo_enlace: m.archivo_enlace ?? m.archivoEnlace ?? '',
        }));
        form.setFieldsValue({
            descripcion: metadata.descripcion || '',
            fuentes,
            metodologia,
            metadato: metadata.metadato || [],
            frecuencia: metadata.frecuencia || '',
            fecha_ultima: metadata.fechaUltima ?? metadata.fecha_ultima ?? '',
            tipo_mapa: metadata.tipoMapa ?? metadata.tipo_mapa ?? undefined,
            tipo_mapa_enlace: metadata.tipoMapaEnlace ?? metadata.tipo_mapa_enlace ?? '',
            texto_leyenda: metadata.textoLeyenda ?? metadata.texto_leyenda ?? '',
            link_final_capa: metadata.linkFinalCapa ?? metadata.link_final_capa ?? '',
        });
    }, [loading, metadata, form]);

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
            message.warning('Media mapalab no disponible');
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

    const onFileUploaded = (file) => {
        const current = form.getFieldValue('metadato') || [];
        form.setFieldsValue({
            metadato: [...current, { nombre: file.nombre, enlace: file.enlace }],
        });
        message.success(`"${file.nombre}" agregado a Archivos adjuntos`);
    };

    if (loading) {
        return <Spin style={{ display: 'block', margin: '24px auto' }} />;
    }

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Alert
                type={derivedFromDescendants ? 'success' : (siblingsSharingCount > 0 ? 'warning' : 'info')}
                showIcon
                message={
                    derivedFromDescendants ? (
                        <span>
                            Este nodo no tiene feature type propio, pero todos sus descendientes usan el mismo:
                            <code style={{ marginLeft: 6 }}>{layerKey}</code>. Editas la metadata de ese feature type
                            (compartida con todas las capas hijas).
                        </span>
                    ) : siblingsSharingCount > 0 ? (
                        <span>
                            Esta capa <b>comparte la metadata</b> con <b>{siblingsSharingCount}</b> capa(s) hermana(s)
                            que usan el mismo feature type <code>{layerKey}</code>.
                            Cualquier cambio aquí afecta a todas. La metadata vive a nivel de feature type GeoServer,
                            no por capa-con-filtro.
                        </span>
                    ) : (
                        <span>
                            Esta sección edita el feature type <code>{layerKey}</code>. Los metadatos se comparten
                            entre todas las capas que usan el mismo feature type.
                        </span>
                    )
                }
            />
            {notFound && (
                <Alert
                    type="warning"
                    showIcon
                    message="Este feature type aún no tiene metadatos. Guarda para crearlos."
                />
            )}

            <Form form={form} layout="vertical">
                <Card size="small" title="Información general">
                    <Form.Item
                        label="Descripción"
                        name="descripcion"
                        extra="Descripción general de qué representa esta capa: tipo de información, alcance geográfico, propósito del dato. Aparece en la ficha de información del visor."
                    >
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item
                        label="Frecuencia de actualización"
                        name="frecuencia"
                        extra="Cada cuánto se publica una nueva versión de esta capa. Selecciona del catálogo para mantener consistencia entre capas."
                    >
                        <Select
                            showSearch
                            allowClear
                            placeholder="Selecciona una frecuencia"
                            options={buildFrecuenciaOptions(watchedFrecuencia)}
                            filterOption={(input, option) =>
                                String(option.value).toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>
                    <Form.Item
                        label="Fecha última actualización"
                        name="fecha_ultima"
                        extra="Fecha de la última versión disponible de esta capa (no la del último cambio del registro). Formato libre: 2024, 2024-Q3, 2024-12, etc."
                    >
                        <Input placeholder="p.ej. 2024 o 2024-Q3" />
                    </Form.Item>
                </Card>

                <Card size="small" title="Estadísticas (numeralia)" style={{ marginTop: 12 }}>
                    <LayerStatsSection
                        layerKey={layerKey}
                        workspace={workspace}
                        geoserverLayer={geoserverLayer}
                        availableFields={availableFields}
                    />
                </Card>

                <Card size="small" title="Fuentes" style={{ marginTop: 12 }}>
                    <Form.List name="fuentes">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name }) => (
                                    <Card
                                        key={key}
                                        type="inner"
                                        size="small"
                                        title={`Fuente ${name + 1}`}
                                        extra={fields.length > 1 ? (
                                            <Button size="small" type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                                        ) : null}
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Form.Item
                                            label="Nombre corto"
                                            name={[name, 'corto']}
                                            extra="Sigla o etiqueta breve de la institución/fuente. Aparece como pill en la ficha (ej. IIEG, INEGI, CONEVAL)."
                                        >
                                            <Input placeholder="p.ej. IIEG" />
                                        </Form.Item>
                                        <Form.Item
                                            label="Nombre largo / cita"
                                            name={[name, 'largo']}
                                            extra="Cita formal completa para uso académico/legal. Incluye nombre institucional, título de la publicación, año y lugar."
                                        >
                                            <Input placeholder="p.ej. IIEG. Carta General del Estado de Jalisco, 2012." />
                                        </Form.Item>
                                        <Form.Item
                                            label="Enlace"
                                            name={[name, 'enlace']}
                                            extra="URL pública a la fuente original (sitio web, documento, portal de datos)."
                                        >
                                            <Input placeholder="https://..." />
                                        </Form.Item>
                                        <Form.Item
                                            label="Texto del enlace (opcional)"
                                            name={[name, 'enlace_label']}
                                            extra="Texto que se muestra como link en el visor. Si lo dejas vacío: 'Ver fuente' cuando hay una sola, o 'Fuente N' cuando hay varias."
                                        >
                                            <Input placeholder="ej. Ficha técnica, Marco geoestadístico, etc." />
                                        </Form.Item>
                                    </Card>
                                ))}
                                <Button type="dashed" onClick={() => add(FUENTE_DEFAULT)} icon={<PlusOutlined />} block>
                                    Agregar fuente
                                </Button>
                            </>
                        )}
                    </Form.List>
                </Card>

                <Card size="small" title="Metodología" style={{ marginTop: 12 }}>
                    <Form.List name="metodologia">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name }) => (
                                    <Card
                                        key={key}
                                        type="inner"
                                        size="small"
                                        title={`Metodología ${name + 1}`}
                                        extra={fields.length > 1 ? (
                                            <Button size="small" type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                                        ) : null}
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Form.Item
                                            label="Texto"
                                            name={[name, 'texto']}
                                            extra="Descripción narrativa del proceso metodológico: cómo se obtuvo, procesó y validó el dato. Aparece como párrafo en la ficha de información."
                                        >
                                            <Input.TextArea rows={3} placeholder="Descripción del proceso metodológico..." />
                                        </Form.Item>
                                        <Form.Item
                                            label="Archivo de metodología (enlace)"
                                            name={[name, 'archivo_enlace']}
                                            extra="URL al documento técnico (PDF u otro) con el detalle metodológico completo. El visor lo expone como link descargable."
                                        >
                                            <Input placeholder="https://... PDF u otro recurso" />
                                        </Form.Item>
                                    </Card>
                                ))}
                                <Button type="dashed" onClick={() => add(META_DEFAULT)} icon={<PlusOutlined />} block>
                                    Agregar metodología
                                </Button>
                            </>
                        )}
                    </Form.List>
                </Card>

                <Card size="small" title="Referencias cartográficas" style={{ marginTop: 12 }}>
                    <Form.Item
                        label="Tipo de mapa base"
                        name="tipo_mapa"
                        extra="Origen cartográfico de la base territorial usada (IIEG, INEGI, etc.). Aparece como referencia en la ficha legal."
                    >
                        <Select
                            allowClear
                            options={TIPO_MAPA_OPTIONS}
                            placeholder="IIEG / INEGI"
                            mode="combobox"
                        />
                    </Form.Item>
                    <Form.Item
                        label="Enlace al PDF/documento del mapa base"
                        name="tipo_mapa_enlace"
                        extra="URL al documento oficial del mapa base (acuerdo, ficha técnica, marco geoestadístico)."
                    >
                        <Input placeholder="https://..." />
                    </Form.Item>
                    <Form.Item
                        label="Texto de leyenda (cita legal)"
                        name="texto_leyenda"
                        extra="Cita formal larga que se muestra como leyenda al pie de la información. Suele incluir nombre institucional, título cartográfico y normativa aplicable."
                    >
                        <Input.TextArea rows={4} placeholder="Texto que aparece como leyenda/cita formal." />
                    </Form.Item>
                    <Form.Item
                        label="Enlace final a la capa (deeplink al visor)"
                        name="link_final_capa"
                        extra="Deep-link público al visor mostrando esta capa activa. Suele incluir lat/lon/zoom + slug. Útil para compartir desde fichas externas."
                    >
                        <Input placeholder="https://iieg.jalisco.gob.mx/mapalab/mapa?..." />
                    </Form.Item>
                </Card>

                <Card
                    size="small"
                    title="Archivos adjuntos"
                    style={{ marginTop: 12 }}
                >
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                        Documentos descargables (TXT/XLSX) asociados a la capa.
                    </Text>
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
                                <Space.Compact block>
                                    <Button
                                        type="dashed"
                                        onClick={() => add({ nombre: '', enlace: '' })}
                                        icon={<PlusOutlined />}
                                        style={{ flex: 1 }}
                                    >
                                        Agregar archivo
                                    </Button>
                                    <Button
                                        type="dashed"
                                        onClick={() => setUploaderOpen(true)}
                                        icon={<UploadOutlined />}
                                        style={{ flex: 1 }}
                                        disabled={!mapalabBucketId}
                                    >
                                        Subir archivo nuevo
                                    </Button>
                                </Space.Compact>
                            </>
                        )}
                    </Form.List>
                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                        <Link to="/media" style={{ fontSize: 12 }}>
                            Administrar todos los archivos →
                        </Link>
                    </div>
                </Card>

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
                title="Elegir archivo"
            />

            <BucketFileUploader
                open={uploaderOpen}
                onClose={() => setUploaderOpen(false)}
                onUploaded={onFileUploaded}
                bucketId={mapalabBucketId}
                prefixes={MAPALAB_PREFIXES}
                title="Subir archivo al bucket mapalab"
                accept=".txt,.xlsx,.pdf,.csv"
            />
        </Space>
    );
}
