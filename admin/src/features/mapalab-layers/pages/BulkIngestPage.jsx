import { useEffect, useState } from 'react';
import { App, Breadcrumb, Button, Form, Space, Steps, Tag, Typography } from 'antd';
import {
    ArrowLeftOutlined,
    CheckCircleOutlined,
    PlayCircleOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import {
    applyPlan,
    cancelPlan,
    fetchColumnPresets,
    uploadAndPlan,
} from '@features/mapalab-layers/services/bulkIngestService';
import UploadForm from '@features/mapalab-layers/components/bulkIngest/UploadForm';
import PreviewPlan from '@features/mapalab-layers/components/bulkIngest/PreviewPlan';
import ResultView from '@features/mapalab-layers/components/bulkIngest/ResultView';

const { Title } = Typography;

export default function BulkIngestPage() {
    const navigate = useNavigate();
    const { message, modal } = App.useApp();

    const [step, setStep] = useState(0);
    const [form] = Form.useForm();
    const [file, setFile] = useState(null);
    const [presets, setPresets] = useState([]);
    const [presetSlug, setPresetSlug] = useState('mapalab-excel');
    const [mapping, setMapping] = useState({});
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [plan, setPlan] = useState(null);
    const [applying, setApplying] = useState(false);
    const [result, setResult] = useState(null);
    const [showMappingModal, setShowMappingModal] = useState(false);

    useEffect(() => {
        fetchColumnPresets()
            .then((data) => {
                setPresets(data);
                const def = data.find((p) => p.slug === 'mapalab-excel') || data[0];
                if (def) setMapping(def.mapping);
            })
            .catch(() => message.error('No se pudieron cargar los presets de columnas'));
    }, [message]);

    const handlePresetChange = (slug) => {
        setPresetSlug(slug);
        const p = presets.find((x) => x.slug === slug);
        if (p) setMapping(p.mapping);
    };

    const handleUpload = async () => {
        try {
            const values = await form.validateFields();
            if (!file) {
                message.error('Selecciona un archivo CSV o XLSX');
                return;
            }
            if (!Object.values(mapping).includes('layer_key')) {
                message.error('El mapeo debe incluir una columna como layer_key');
                return;
            }
            setUploading(true);
            setUploadProgress(0);
            const data = await uploadAndPlan({
                file,
                dependencia: values.dependencia,
                columnMapping: mapping,
                onProgress: setUploadProgress,
            });
            setPlan(data);
            setStep(1);
        } catch (err) {
            const detail = err?.response?.data?.detail || err?.message || 'Error al procesar';
            message.error(typeof detail === 'string' ? detail : JSON.stringify(detail));
        } finally {
            setUploading(false);
        }
    };

    const handleApply = () => {
        if (!plan) return;
        modal.confirm({
            title: 'Aplicar cambios a la base',
            content: `Se escribirán ${plan.plan.stats.inserts + plan.plan.stats.updates} cambios en layer_metadata y ${plan.plan.stats.statsInserts + plan.plan.stats.statsUpdates} en layer_stats. ¿Continuar?`,
            okText: 'Aplicar',
            cancelText: 'Cancelar',
            onOk: async () => {
                setApplying(true);
                try {
                    const res = await applyPlan(plan.planId, null);
                    setResult(res);
                    setStep(2);
                    message.success('Cambios aplicados');
                } catch (err) {
                    const detail = err?.response?.data?.detail || err?.message || 'Error al aplicar';
                    message.error(typeof detail === 'string' ? detail : JSON.stringify(detail));
                } finally {
                    setApplying(false);
                }
            },
        });
    };

    const handleCancel = () => {
        if (!plan) return;
        modal.confirm({
            title: 'Cancelar plan',
            content: 'El plan se descartará. ¿Continuar?',
            okText: 'Sí, cancelar',
            cancelText: 'No',
            onOk: async () => {
                try {
                    await cancelPlan(plan.planId);
                    setPlan(null);
                    setStep(0);
                    setFile(null);
                    form.resetFields();
                    message.info('Plan cancelado');
                } catch {
                    message.error('No se pudo cancelar');
                }
            },
        });
    };

    const handleAgain = () => {
        setStep(0);
        setPlan(null);
        setResult(null);
        setFile(null);
        form.resetFields();
    };

    return (
        <div style={{ padding: 24 }}>
            <Breadcrumb
                items={[
                    { title: <Button type="link" size="small" onClick={() => navigate('/mapalab/layers')} style={{ padding: 0 }}>Capas</Button> },
                    { title: 'Ingesta masiva' },
                ]}
                style={{ marginBottom: 16 }}
            />

            <Space align="center" style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/mapalab/layers')}>
                    Volver
                </Button>
                <Title level={3} style={{ margin: 0 }}>
                    Ingesta masiva de metadatos
                </Title>
                <Tag color="purple">BETA</Tag>
            </Space>

            <Steps
                current={step}
                items={[
                    { title: 'Subir archivo', icon: <UploadOutlined /> },
                    { title: 'Previsualizar plan', icon: <PlayCircleOutlined /> },
                    { title: 'Aplicado', icon: <CheckCircleOutlined /> },
                ]}
                style={{ marginBottom: 24 }}
            />

            {step === 0 && (
                <UploadForm
                    form={form}
                    file={file}
                    setFile={setFile}
                    presets={presets}
                    presetSlug={presetSlug}
                    onPresetChange={handlePresetChange}
                    mapping={mapping}
                    setMapping={setMapping}
                    onUpload={handleUpload}
                    uploading={uploading}
                    uploadProgress={uploadProgress}
                    showMappingModal={showMappingModal}
                    setShowMappingModal={setShowMappingModal}
                />
            )}

            {step === 1 && plan && (
                <PreviewPlan
                    plan={plan}
                    onApply={handleApply}
                    onCancel={handleCancel}
                    applying={applying}
                />
            )}

            {step === 2 && result && (
                <ResultView result={result} onAgain={handleAgain} />
            )}
        </div>
    );
}
