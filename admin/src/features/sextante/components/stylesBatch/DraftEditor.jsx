import { useEffect, useState } from 'react';
import { Button, Space, Spin } from 'antd';
import { message } from '@shared/services/message';
import { batchErrorMessage, createDrafts } from '@features/sextante/api/stylesBatchService';
import { rowsToTable } from '@features/sextante/utils/stylesBatchTable';
import useBatchRows from '@features/sextante/hooks/useBatchRows';
import ReviewStep from './ReviewStep';

export default function DraftEditor({ load, replacing = [], savedText = 'Borrador actualizado', onSaved, onCancel }) {
    const { rows, setRows, checkingRows, checking, withErrors, changeRow } = useBatchRows([]);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;
        load()
            .then((found) => { if (active) setRows(found); })
            .catch((err) => message.error(batchErrorMessage(err, 'No se pudo abrir el estilo')))
            .finally(() => { if (active) setLoaded(true); });
        return () => { active = false; };
    }, [load, setRows]);

    const save = async () => {
        setSaving(true);
        try {
            await createDrafts(rowsToTable(rows), replacing);
            message.success(savedText);
            onSaved();
        } catch (err) {
            const filas = err?.response?.data?.detail?.filas;
            if (filas?.length) setRows(filas);
            message.error(batchErrorMessage(err, 'No se pudo guardar'));
        } finally {
            setSaving(false);
        }
    };

    if (!loaded) return <Spin />;

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <ReviewStep rows={rows} checkingRows={checkingRows} onChangeRow={changeRow} scrollY={null} />
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button shape="round" onClick={onCancel}>Cancelar</Button>
                <Button
                    type="primary"
                    shape="round"
                    loading={saving}
                    disabled={!rows.length || withErrors.length > 0 || checking}
                    onClick={save}
                >
                    Guardar
                </Button>
            </Space>
        </Space>
    );
}
