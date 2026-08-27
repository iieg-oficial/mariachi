import { Button, Card, Form, Input, Progress, Select, Space, Typography, Upload } from 'antd';
import { InboxOutlined, PlayCircleOutlined, SettingOutlined } from '@ant-design/icons';
import MappingModal from '@features/mapalab-layers/components/bulkIngest/MappingModal';

const { Text, Paragraph } = Typography;
const { Dragger } = Upload;

export default function UploadForm({
    form,
    file,
    setFile,
    presets,
    presetSlug,
    onPresetChange,
    mapping,
    setMapping,
    onUpload,
    uploading,
    uploadProgress,
    showMappingModal,
    setShowMappingModal,
}) {
    return (
        <Card>
            <Paragraph type="secondary">
                Sube un CSV o XLSX con metadatos de capas. Se mapean las columnas a campos técnicos
                de <Text code>mapalab.layer_metadata</Text> y <Text code>mapalab.layer_stats</Text>.
                Antes de escribir nada, verás un plan con los cambios uno por uno.
            </Paragraph>

            <Form form={form} layout="vertical" requiredMark={false}>
                <Form.Item
                    name="dependencia"
                    label="Dependencia / origen"
                    rules={[{ required: true, message: 'Indica de dónde viene este archivo' }]}
                    tooltip="Etiqueta libre que queda en el plan, p.ej. imeplan, sct, salud."
                >
                    <Input placeholder="imeplan" maxLength={100} />
                </Form.Item>

                <Form.Item label="Preset de mapeo de columnas">
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        <Select
                            value={presetSlug}
                            onChange={onPresetChange}
                            options={presets.map((p) => ({ value: p.slug, label: p.label }))}
                            placeholder="Selecciona un preset"
                            style={{ width: '100%' }}
                        />
                        <Button
                            icon={<SettingOutlined />}
                            onClick={() => setShowMappingModal(true)}
                            disabled={!Object.keys(mapping).length}
                        >
                            Ajustar mapeo de columnas ({Object.keys(mapping).length})
                        </Button>
                    </Space>
                </Form.Item>

                <Form.Item label="Archivo">
                    <Dragger
                        beforeUpload={(f) => { setFile(f); return false; }}
                        onRemove={() => setFile(null)}
                        fileList={file ? [{ uid: '1', name: file.name, status: 'done' }] : []}
                        accept=".csv,.xlsx"
                        maxCount={1}
                    >
                        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                        <p className="ant-upload-text">Arrastra el archivo aquí o haz clic</p>
                        <p className="ant-upload-hint">CSV (UTF-8) o XLSX. Máximo 10 MB.</p>
                    </Dragger>
                </Form.Item>

                {uploading && (
                    <Progress percent={uploadProgress} status="active" style={{ marginBottom: 16 }} />
                )}

                <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={onUpload}
                    loading={uploading}
                    disabled={!file}
                    size="large"
                    block
                >
                    Subir y previsualizar
                </Button>
            </Form>

            <MappingModal
                open={showMappingModal}
                onClose={() => setShowMappingModal(false)}
                mapping={mapping}
                setMapping={setMapping}
            />
        </Card>
    );
}
