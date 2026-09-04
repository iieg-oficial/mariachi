import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Form, Input, Select, Space, Spin, Tooltip, Typography, Row, Col } from 'antd';
import { PlusOutlined, MinusCircleOutlined, FolderOpenOutlined, UploadOutlined } from '@ant-design/icons';
import { Link } from 'react-router';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import { BucketFilePicker, BucketFileUploader, useAccessibleBuckets } from '@features/acervo';
import { FRECUENCIA_OPTIONS, TIPO_MAPA_OPTIONS } from '@features/mapalab-layers/constants/metadataCatalogs';
import EditorSection from '@features/mapalab-layers/components/layersEditor/EditorSection';
import MetadataPreview from '@features/mapalab-layers/components/layersEditor/MetadataPreview';
import FechaUltimaField from '@features/mapalab-layers/components/layersEditor/FechaUltimaField';
import SugerenciaPeriodicidad from '@features/mapalab-layers/components/layersEditor/SugerenciaPeriodicidad';
import { message } from '@shared/services/message';

const { Text } = Typography;

const PICKER_BUCKET_SLUGS = ['mapalab', 'iieg'];
const UPLOAD_BUCKET_SLUGS = ['mapalab'];
const MAPALAB_PREFIXES = ['metadata/txt/', 'metadata/xlsx/'];

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
    derivedFromDescendants = false,
    siblingsSharingCount = 0,
    layerLabel,
    ultimoDatoRegistrado = null,
    onDraftSaved,
    onBaseline,
    onIrAEstadisticas,
    numeralia = [],
}) {
    const [seccionAbierta, setSeccionAbierta] = useState('general');
    const autosaveTimer = useRef(null);
    const asentadoRef = useRef(false);
    const { getLayerMetadata, saveMetadataDraft } = useLayerTreeAdmin();
    const [form] = Form.useForm();
    const watchedFrecuencia = Form.useWatch('frecuencia', form);
    const fechaActual = Form.useWatch('fecha_ultima', form);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerFieldIndex, setPickerFieldIndex] = useState(null);
    const [uploaderOpen, setUploaderOpen] = useState(false);
    const { buckets: uploadBuckets } = useAccessibleBuckets(UPLOAD_BUCKET_SLUGS);
    const mapalabBucketId = uploadBuckets[0]?.id ?? null;

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

    const autoguardar = useCallback(async (valores) => {
        setSaving(true);
        try {
            await saveMetadataDraft(layerKey, valores);
            setNotFound(false);
            onDraftSaved?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo guardar el borrador de los metadatos');
        } finally {
            setSaving(false);
        }
    }, [layerKey, saveMetadataDraft, onDraftSaved]);

    const alCambiar = () => {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => autoguardar(form.getFieldsValue()), 1500);
    };

    useEffect(() => {
        if (loading) return undefined;
        asentadoRef.current = false;
        onBaseline?.(layerKey, form.getFieldsValue());
        const asentar = setTimeout(() => { asentadoRef.current = true; }, 1500);
        return () => clearTimeout(asentar);
    }, [loading, metadata, layerKey, form, onBaseline]);

    useEffect(() => () => {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    }, []);

    const openPicker = (index) => {
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
            {siblingsSharingCount > 0 ? (
                <Alert closable
                    type="warning"
                    showIcon
                    title={
                        <span>
                            Esta capa <b>comparte la metadata</b> con <b>{siblingsSharingCount}</b> capa(s) hermana(s)
                            que usan el mismo feature type <code>{layerKey}</code>. Cualquier cambio aquí afecta a todas.
                        </span>
                    }
                />
            ) : (
                <Tooltip title={derivedFromDescendants
                    ? 'Este nodo no tiene feature type propio: lo toma de sus descendientes, que usan todos el mismo. Lo que edites aquí es la metadata de ese feature type, compartida con todas las capas hijas.'
                    : 'Los metadatos se guardan por feature type de GeoServer, así que se comparten con cualquier capa que use el mismo.'}
                >
                    <Text type="secondary" style={{ fontSize: 12, cursor: 'help' }}>
                        Feature type <code>{layerKey}</code>
                        {derivedFromDescendants ? ' · heredado de sus capas hijas' : ''}
                    </Text>
                </Tooltip>
            )}
            {notFound && (
                <Alert closable
                    type="warning"
                    showIcon
                    title="Este feature type aún no tiene metadatos. Guarda para crearlos."
                />
            )}

            <Row gutter={24} style={{ width: '100%' }}>
                <Col xs={24} lg={14} style={{ minWidth: 0 }}>
                    <Form form={form} layout="vertical" onValuesChange={alCambiar}>
                        <EditorSection
                            title="Información general"
                            open={seccionAbierta === 'general'}
                            onOpenChange={(v) => setSeccionAbierta(v ? 'general' : null)}
                        >
                            <Form.Item
                                label="Descripción"
                                name="descripcion"
                                tooltip="Descripción general de qué representa esta capa: tipo de información, alcance geográfico, propósito del dato. Aparece en la ficha de información del visor."
                            >
                                <Input.TextArea rows={3} />
                            </Form.Item>
                            <Form.Item
                                label="Frecuencia de actualización"
                                name="frecuencia"
                                label={(
                                    <Space size={4}>
                                        Frecuencia de actualización
                                        <SugerenciaPeriodicidad
                                            campo="la frecuencia"
                                            valor={watchedFrecuencia}
                                            sugerido={metadata?.frecuenciaSugerida ?? metadata?.frecuencia_sugerida}
                                            actualizadaEn={metadata?.sugerenciasActualizadasEn ?? metadata?.sugerencias_actualizadas_en}
                                            onAplicar={(v) => { form.setFieldValue('frecuencia', v); alCambiar(); }}
                                        />
                                    </Space>
                                )}
                                tooltip="Cada cuánto se publica una nueva versión de esta capa. Selecciona del catálogo para mantener consistencia entre capas."
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
                                label={(
                                    <Space size={4}>
                                        Última actualización
                                        <SugerenciaPeriodicidad
                                            campo="la fecha"
                                            valor={fechaActual}
                                            sugerido={metadata?.fechaUltimaSugerida ?? metadata?.fecha_ultima_sugerida}
                                            actualizadaEn={metadata?.sugerenciasActualizadasEn ?? metadata?.sugerencias_actualizadas_en}
                                            onAplicar={(v) => { form.setFieldValue('fecha_ultima', v); alCambiar(); }}
                                        />
                                    </Space>
                                )}
                                tooltip="Fecha de la última versión disponible de esta capa, no la del último cambio del registro. Se elige con calendario para que todas las capas usen la misma sintaxis: año, o año-mes-día."
                            >
                                <FechaUltimaField sugerida={ultimoDatoRegistrado} />
                            </Form.Item>
                        </EditorSection>

                        <EditorSection
                            title="Fuentes"
                            open={seccionAbierta === 'fuentes'}
                            onOpenChange={(v) => setSeccionAbierta(v ? 'fuentes' : null)}
                        >
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
                                                    tooltip="Sigla o etiqueta breve de la institución/fuente. Aparece como pill en la ficha (ej. IIEG, INEGI, CONEVAL)."
                                                >
                                                    <Input placeholder="p.ej. IIEG" />
                                                </Form.Item>
                                                <Form.Item
                                                    label="Nombre largo / cita"
                                                    name={[name, 'largo']}
                                                    tooltip="Cita formal completa para uso académico/legal. Incluye nombre institucional, título de la publicación, año y lugar."
                                                >
                                                    <Input placeholder="p.ej. IIEG. Carta General del Estado de Jalisco, 2012." />
                                                </Form.Item>
                                                <Form.Item
                                                    label="Enlace"
                                                    name={[name, 'enlace']}
                                                    tooltip="URL pública a la fuente original (sitio web, documento, portal de datos)."
                                                >
                                                    <Input placeholder="https://..." />
                                                </Form.Item>
                                                <Form.Item
                                                    label="Texto del enlace (opcional)"
                                                    name={[name, 'enlace_label']}
                                                    tooltip="Texto que se muestra como link en el visor. Si lo dejas vacío: 'Ver fuente' cuando hay una sola, o 'Fuente N' cuando hay varias."
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
                        </EditorSection>

                        <EditorSection
                            title="Metodología"
                            open={seccionAbierta === 'metodologia'}
                            onOpenChange={(v) => setSeccionAbierta(v ? 'metodologia' : null)}
                        >
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
                                                    tooltip="Descripción narrativa del proceso metodológico: cómo se obtuvo, procesó y validó el dato. Aparece como párrafo en la ficha de información."
                                                >
                                                    <Input.TextArea rows={3} placeholder="Descripción del proceso metodológico..." />
                                                </Form.Item>
                                                <Form.Item
                                                    label="Archivo de metodología (enlace)"
                                                    name={[name, 'archivo_enlace']}
                                                    tooltip="URL al documento técnico (PDF u otro) con el detalle metodológico completo. El visor lo expone como link descargable."
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
                        </EditorSection>

                        <EditorSection
                            title="Referencias cartográficas"
                            open={seccionAbierta === 'referencias'}
                            onOpenChange={(v) => setSeccionAbierta(v ? 'referencias' : null)}
                        >
                            <Form.Item
                                label="Tipo de mapa base"
                                name="tipo_mapa"
                                tooltip="Origen cartográfico de la base territorial usada (IIEG, INEGI, etc.). Aparece como referencia en la ficha legal."
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
                                tooltip="URL al documento oficial del mapa base (acuerdo, ficha técnica, marco geoestadístico)."
                            >
                                <Input placeholder="https://..." />
                            </Form.Item>
                            <Form.Item
                                label="Texto de leyenda (cita legal)"
                                name="texto_leyenda"
                                tooltip="Cita formal larga que se muestra como leyenda al pie de la información. Suele incluir nombre institucional, título cartográfico y normativa aplicable."
                            >
                                <Input.TextArea rows={4} placeholder="Texto que aparece como leyenda/cita formal." />
                            </Form.Item>
                            <Form.Item
                                label="Enlace final a la capa (deeplink al visor)"
                                name="link_final_capa"
                                tooltip="Deep-link público al visor mostrando esta capa activa. Suele incluir lat/lon/zoom + slug. Útil para compartir desde fichas externas."
                            >
                                <Input placeholder="https://iieg.jalisco.gob.mx/mapalab/mapa?..." />
                            </Form.Item>
                        </EditorSection>

                        <EditorSection
                            title="Archivos adjuntos"
                            hint="Documentos descargables (TXT/XLSX) asociados a la capa. El visor los lista como «Metadato»."
                            open={seccionAbierta === 'adjuntos'}
                            onOpenChange={(v) => setSeccionAbierta(v ? 'adjuntos' : null)}
                        >
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
                                <Link to="/acervo" style={{ fontSize: 12 }}>
                            Administrar todos los archivos →
                                </Link>
                            </div>
                        </EditorSection>

                    </Form>
                </Col>
                <Col xs={24} lg={10} style={{ minWidth: 0 }}>
                    <div style={{ position: 'sticky', top: 0 }}>
                        <MetadataPreview
                            form={form}
                            layerKey={layerKey}
                            layerLabel={layerLabel}
                            numeralia={numeralia}
                            saving={saving}
                            onAbrirSeccion={setSeccionAbierta}
                            onIrAEstadisticas={onIrAEstadisticas}
                        />
                    </div>
                </Col>
            </Row>

            <BucketFilePicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={onFileSelected}
                bucketSlugs={PICKER_BUCKET_SLUGS}
                prefixes={MAPALAB_PREFIXES}
                title="Elegir archivo"
                uploadAccept=".txt,.xlsx,.pdf,.csv"
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
