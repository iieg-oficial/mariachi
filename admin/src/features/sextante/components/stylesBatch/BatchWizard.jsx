import { useEffect, useRef, useState } from 'react';
import { Button, Card, Space, Steps } from 'antd';
import { message } from '@shared/services/message';
import {
    batchErrorMessage,
    createDrafts,
    readTableFile,
    reviewTable,
} from '@features/sextante/api/stylesBatchService';
import { removeRows, rowsToTable, updateRow } from '@features/sextante/utils/stylesBatchTable';
import { loadBatch, saveBatch } from '@features/sextante/utils/stylesBatchStorage';
import UploadStep from './UploadStep';
import ReviewStep from './ReviewStep';
import PreviewStep from './PreviewStep';
import ResultStep from './ResultStep';

const STEPS = [{ title: 'Subir tabla' }, { title: 'Revisar filas' }, { title: 'Vista previa' }, { title: 'Borradores' }];
const RECHECK_DELAY = 500;

export default function BatchWizard({ canPublish }) {
    const [saved] = useState(loadBatch);
    const [step, setStep] = useState(saved?.step ?? 0);
    const [rows, setRows] = useState(saved?.rows ?? []);
    const [drafts, setDrafts] = useState(saved?.drafts ?? []);
    const [replacing, setReplacing] = useState(saved?.replacing ?? []);
    const [loading, setLoading] = useState(false);
    const [checkingRows, setCheckingRows] = useState([]);
    const recheck = useRef(null);

    useEffect(() => () => clearTimeout(recheck.current), []);
    useEffect(() => {
        saveBatch(step === 0 && !rows.length ? null : { step, rows, drafts, replacing });
    }, [step, rows, drafts, replacing]);

    const withErrors = rows.some((row) => row.errores.length);

    const review = async (text) => {
        try {
            setRows(await reviewTable(text));
            setStep(1);
        } catch (err) {
            message.error(batchErrorMessage(err, 'No se pudo leer la tabla'));
        }
    };

    const withLoading = (task) => async (...args) => {
        setLoading(true);
        try {
            await task(...args);
        } catch (err) {
            message.error(batchErrorMessage(err, 'No se pudo leer el archivo'));
        } finally {
            setLoading(false);
        }
    };

    const handleFile = withLoading(async (file) => review(await readTableFile(file)));
    const handleTable = withLoading(review);

    const recheckRows = (next, touched, delay) => {
        setRows(next);
        setCheckingRows((prev) => [...new Set([...prev, ...touched])]);
        clearTimeout(recheck.current);
        recheck.current = setTimeout(async () => {
            try {
                setRows(next.length ? await reviewTable(rowsToTable(next)) : []);
            } catch (err) {
                message.error(batchErrorMessage(err, 'No se pudo revisar la tabla'));
            } finally {
                setCheckingRows([]);
            }
        }, delay);
    };

    const handleChangeRow = (fila, changes) => recheckRows(updateRow(rows, fila, changes), [fila], RECHECK_DELAY);
    const handleRemoveRows = (filas) => recheckRows(removeRows(rows, filas), [], 0);

    const handleSave = async () => {
        setLoading(true);
        try {
            setDrafts(await createDrafts(rowsToTable(rows), replacing));
            setReplacing([]);
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
        setReplacing([]);
        setStep(0);
    };

    const back = step > 0 && step < 3
        ? <Button shape="round" onClick={() => setStep(step - 1)}>Atrás</Button>
        : <span />;

    const next = {
        1: (
            <Space>
                <Button shape="round" onClick={restart}>Empezar otro</Button>
                <Button type="primary" shape="round" disabled={withErrors || checkingRows.length > 0 || !rows.length} onClick={() => setStep(2)}>
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
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Steps current={step} items={STEPS} size="small" />
            <Card>
                {step === 0 && <UploadStep loading={loading} onFile={handleFile} onSubmit={handleTable} />}
                {step === 1 && (
                    <ReviewStep rows={rows} checkingRows={checkingRows} onChangeRow={handleChangeRow} onRemoveRows={handleRemoveRows} />
                )}
                {step === 2 && <PreviewStep rows={rows} />}
                {step === 3 && <ResultStep drafts={drafts} canPublish={canPublish} />}
            </Card>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                {back}
                {next || <span />}
            </Space>
        </Space>
    );
}
