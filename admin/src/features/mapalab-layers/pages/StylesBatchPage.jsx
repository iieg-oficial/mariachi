import { useEffect, useRef, useState } from 'react';
import { Breadcrumb, Button, Card, Space, Steps, Typography } from 'antd';
import { useAuth } from '@shared/contexts/useAuth';
import { message } from '@shared/services/message';
import {
    batchErrorMessage,
    createDrafts,
    reviewTable,
} from '@features/mapalab-layers/services/stylesBatchService';
import { rowsToTable, updateRow } from '@features/mapalab-layers/utils/stylesBatchTable';
import UploadStep from '@features/mapalab-layers/components/stylesBatch/UploadStep';
import ReviewStep from '@features/mapalab-layers/components/stylesBatch/ReviewStep';
import PreviewCard from '@features/mapalab-layers/components/stylesBatch/PreviewCard';
import ResultStep from '@features/mapalab-layers/components/stylesBatch/ResultStep';

const { Title } = Typography;

const STEPS = [
    { title: 'Subir tabla' },
    { title: 'Revisar filas' },
    { title: 'Vista previa' },
    { title: 'Borradores' },
];

const RECHECK_DELAY = 500;
const PUBLISH_PERMISSION = 'mariachi.mapalab.manage';

export default function StylesBatchPage() {
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [rows, setRows] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const recheck = useRef(null);

    useEffect(() => () => clearTimeout(recheck.current), []);

    const canPublish = Boolean(user?.permissions?.includes?.(PUBLISH_PERMISSION));
    const withErrors = rows.some((row) => row.errores.length);

    const handleTable = async (text) => {
        setLoading(true);
        try {
            setRows(await reviewTable(text));
            setStep(1);
        } catch (err) {
            message.error(batchErrorMessage(err, 'No se pudo leer la tabla'));
        } finally {
            setLoading(false);
        }
    };

    const handleChangeRow = (fila, changes) => {
        const next = updateRow(rows, fila, changes);
        setRows(next);
        clearTimeout(recheck.current);
        recheck.current = setTimeout(async () => {
            setChecking(true);
            try {
                setRows(await reviewTable(rowsToTable(next)));
            } catch (err) {
                message.error(batchErrorMessage(err, 'No se pudo revisar la tabla'));
            } finally {
                setChecking(false);
            }
        }, RECHECK_DELAY);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            setDrafts(await createDrafts(rowsToTable(rows)));
            setStep(3);
        } catch (err) {
            const filas = err?.response?.data?.detail?.filas;
            if (filas?.length) {
                setRows(filas);
                setStep(1);
            }
            message.error(batchErrorMessage(err, 'No se pudieron guardar los borradores'));
        } finally {
            setLoading(false);
        }
    };

    const restart = () => {
        setRows([]);
        setDrafts([]);
        setStep(0);
    };

    const back = step > 0 && step < 3
        ? <Button shape="round" onClick={() => setStep(step - 1)}>Atrás</Button>
        : <span />;

    const next = {
        1: (
            <Button type="primary" shape="round" disabled={withErrors || checking} onClick={() => setStep(2)}>
                Ver cómo quedan
            </Button>
        ),
        2: (
            <Button type="primary" shape="round" loading={loading} onClick={handleSave}>
                Guardar {rows.length} borradores
            </Button>
        ),
        3: <Button shape="round" onClick={restart}>Otro lote</Button>,
    }[step];

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Breadcrumb items={[{ title: 'MapaLab' }, { title: 'Capas' }, { title: 'Estilos en lote' }]} />
            <Title level={3} style={{ margin: 0 }}>Estilos en lote</Title>
            <Steps current={step} items={STEPS} size="small" />
            <Card>
                {step === 0 && <UploadStep loading={loading} onSubmit={handleTable} />}
                {step === 1 && <ReviewStep rows={rows} checking={checking} onChangeRow={handleChangeRow} />}
                {step === 2 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                        {rows.map((row) => <PreviewCard key={row.fila} row={row} />)}
                    </div>
                )}
                {step === 3 && <ResultStep drafts={drafts} canPublish={canPublish} />}
            </Card>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                {back}
                {next || <span />}
            </Space>
        </Space>
    );
}
