import { useEffect, useState } from 'react';
import { Badge, Button, Card, Space, Steps, Tooltip, Typography } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { batchErrorMessage, createDrafts, readTableFile, reviewTable } from '@features/sextante/api/stylesBatchService';
import { rowsToTable } from '@features/sextante/utils/stylesBatchTable';
import { loadBatch, saveBatch } from '@features/sextante/utils/stylesBatchStorage';
import useBatchRows from '@features/sextante/hooks/useBatchRows';
import UploadStep from './UploadStep';
import ReviewStep from './ReviewStep';
import PreviewStep from './PreviewStep';
import ResultStep from './ResultStep';

const { Text } = Typography;

const STEPS = [{ title: 'Subir tabla' }, { title: 'Revisar filas' }, { title: 'Vista previa' }, { title: 'Borradores' }];
const SAVED_TIP = 'Aún no cambia nada en el visor. Se publican desde Sin publicar o desde Revisión.';

export default function BatchWizard({ canPublish }) {
    const [saved] = useState(loadBatch);
    const [step, setStep] = useState(saved?.step ?? 0);
    const [reached, setReached] = useState(saved?.reached ?? saved?.step ?? 0);
    const [drafts, setDrafts] = useState(saved?.drafts ?? []);
    const [replacing, setReplacing] = useState(saved?.replacing ?? []);
    const [loading, setLoading] = useState(false);
    const { rows, setRows, checkingRows, checking, withErrors, changeRow, removeRows } = useBatchRows(saved?.rows ?? []);

    useEffect(() => {
        saveBatch(step === 0 && !rows.length ? null : { step, reached, rows, drafts, replacing });
    }, [step, reached, rows, drafts, replacing]);

    const goTo = (next) => {
        if (step === 3 && next < 3) setReplacing((prev) => [...new Set([...prev, ...drafts.map((d) => d.id)])]);
        setStep(next);
        setReached((prev) => Math.max(prev, next));
    };

    const canOpen = (index) => {
        if (index === 0) return true;
        if (index > reached || !rows.length) return false;
        if (index >= 2 && (withErrors.length > 0 || checking)) return false;
        return index < 3 || drafts.length > 0;
    };

    const withLoading = (task, fallback) => async (...args) => {
        setLoading(true);
        try {
            await task(...args);
        } catch (err) {
            message.error(batchErrorMessage(err, fallback));
        } finally {
            setLoading(false);
        }
    };

    const review = async (text) => {
        setRows(await reviewTable(text));
        goTo(1);
    };

    const handleFile = withLoading(async (file) => review(await readTableFile(file)), 'No se pudo leer el archivo');
    const handleTable = withLoading(review, 'No se pudo leer la tabla');

    const handleSave = async () => {
        setLoading(true);
        try {
            setDrafts(await createDrafts(rowsToTable(rows), replacing));
            setReplacing([]);
            goTo(3);
        } catch (err) {
            const filas = err?.response?.data?.detail?.filas;
            if (filas?.length) {
                setRows(filas);
                goTo(1);
            }
            message.error(batchErrorMessage(err, 'No se pudieron guardar los borradores'));
        } finally {
            setLoading(false);
        }
    };

    const restart = () => {
        setRows([]);
        setDrafts([]);
        setReplacing([]);
        setStep(0);
        setReached(0);
    };

    const back = (
        <Tooltip title="Atrás">
            <Button shape="circle" icon={<ArrowLeftOutlined />} aria-label="Atrás" onClick={() => goTo(step - 1)} />
        </Tooltip>
    );

    const errorBadge = withErrors.length > 0 && (
        <Tooltip title={`${withErrors.length} de ${rows.length} tienen error`}>
            <Badge count={`+${withErrors.length}`} color="var(--ant-color-error)" />
        </Tooltip>
    );

    const title = {
        0: 'Sube tu tabla',
        1: <Space>{back}<Text strong>{rows.length} estilos</Text>{errorBadge}</Space>,
        2: <Space>{back}<Text strong>Vista previa</Text></Space>,
        3: (
            <Space>
                <Text strong>{drafts.length} borradores guardados</Text>
                <Tooltip title={SAVED_TIP}><InfoCircleOutlined aria-label={SAVED_TIP} /></Tooltip>
            </Space>
        ),
    }[step];

    const extra = {
        1: (
            <Space wrap>
                {withErrors.length > 0 && (
                    <Button shape="round" danger onClick={() => removeRows(withErrors)}>
                        Quitar {withErrors.length} con error
                    </Button>
                )}
                <Button shape="round" onClick={restart}>Empezar otro</Button>
                <Button
                    type="primary"
                    shape="round"
                    icon={<ArrowRightOutlined />}
                    iconPlacement="end"
                    disabled={withErrors.length > 0 || checking || !rows.length}
                    onClick={() => goTo(2)}
                >
                    Ver cómo quedan
                </Button>
            </Space>
        ),
        2: (
            <Button type="primary" shape="round" loading={loading} onClick={handleSave}>
                {replacing.length ? `Actualizar ${rows.length} borradores` : `Guardar ${rows.length} borradores`}
            </Button>
        ),
        3: <Button shape="round" onClick={restart}>Otro lote</Button>,
    }[step];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 24 }}>
            <Steps
                current={step}
                size="small"
                onChange={goTo}
                items={STEPS.map((item, index) => ({ ...item, disabled: !canOpen(index) }))}
            />
            <Card title={title} extra={extra}>
                {step === 0 && <UploadStep loading={loading} onFile={handleFile} onSubmit={handleTable} />}
                {step === 1 && (
                    <ReviewStep rows={rows} checkingRows={checkingRows} onChangeRow={changeRow} onRemoveRows={removeRows} fill />
                )}
                {step === 2 && <PreviewStep rows={rows} />}
                {step === 3 && <ResultStep drafts={drafts} canPublish={canPublish} />}
            </Card>
        </div>
    );
}
