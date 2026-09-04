import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Modal, Space, Typography } from 'antd';
import { ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { listMosaics, reindexMosaic, resetGeoserver } from '@features/sextante/api/mosaicService';

const { Text, Paragraph } = Typography;

const fullPathOf = (workspace, currentPath) => {
    if (!workspace) return '';
    const clean = (currentPath || '').replace(/^\/+|\/+$/g, '');
    return clean ? `workspaces/${workspace}/${clean}` : `workspaces/${workspace}`;
};

const resultContent = (data) => (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        <Text>Índice reconstruido a partir de {data.rasters} ráster(es).</Text>
        <Text type="secondary">Borrados: {data.deleted.join(', ')}</Text>
        {data.preserved.length > 0 && (
            <Text type="secondary">Conservados: {data.preserved.join(', ')}</Text>
        )}
        {data.untouched.length > 0 && (
            <Text type="secondary">Sin tocar: {data.untouched.join(', ')}</Text>
        )}
        <Text type="secondary">Respaldo: {data.backup}</Text>
        <Text type="secondary">
            Render: {data.render_before ?? '?'} → {data.render_after ?? '?'} bytes
        </Text>
    </Space>
);

export default function MosaicActions({ workspace, currentPath, onDone }) {
    const [mosaics, setMosaics] = useState([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let alive = true;
        listMosaics()
            .then((data) => { if (alive) setMosaics(data); })
            .catch(() => { if (alive) setMosaics([]); });
        return () => { alive = false; };
    }, []);

    const mosaic = useMemo(() => {
        const target = fullPathOf(workspace, currentPath);
        if (!target) return null;
        return mosaics.find((m) => m.path === target) || null;
    }, [mosaics, workspace, currentPath]);

    const runReindex = useCallback(async () => {
        setBusy(true);
        try {
            const data = await reindexMosaic({ workspace: mosaic.workspace, store: mosaic.store });
            Modal.success({ title: `Mosaico ${mosaic.store} reindexado`, content: resultContent(data) });
            onDone?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo reindexar el mosaico');
        } finally {
            setBusy(false);
        }
    }, [mosaic, onDone]);

    const confirmReindex = () => {
        Modal.confirm({
            title: `Reindexar ${mosaic.store}`,
            width: 560,
            content: (
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                    <Paragraph style={{ marginBottom: 0 }}>
                        Borra el índice del mosaico para que GeoServer lo reconstruya contra los rásters
                        que hay hoy en la carpeta. Es lo que corrige una capa que quedó en negro tras
                        reemplazar los archivos.
                    </Paragraph>
                    <Text type="secondary">
                        Se borran: el índice (<Text code>{mosaic.store}.dbf</Text>, <Text code>.shp</Text>,
                        {' '}<Text code>.shx</Text>, <Text code>.qix</Text>, <Text code>.fix</Text>,
                        {' '}<Text code>.prj</Text>, <Text code>.properties</Text>) y
                        {' '}<Text code>sample_image.dat</Text>.
                    </Text>
                    <Text type="secondary">
                        Se conservan: los <Text code>.tif</Text>, <Text code>indexer.properties</Text> y
                        {' '}<Text code>timeregex.properties</Text>. Todo lo demás queda intacto.
                    </Text>
                    <Text type="secondary">
                        Se respalda antes de borrar y se restaura solo si el render falla.
                    </Text>
                </Space>
            ),
            okText: 'Reindexar',
            cancelText: 'Cancelar',
            onOk: runReindex,
        });
    };

    const confirmReset = () => {
        Modal.confirm({
            title: 'Reset de GeoServer',
            content: (
                <Paragraph style={{ marginBottom: 0 }}>
                    Vacía las cachés en memoria de GeoServer: readers, estilos y esquemas se releen del
                    disco. No borra nada, pero las primeras peticiones después van más lentas.
                </Paragraph>
            ),
            okText: 'Ejecutar',
            cancelText: 'Cancelar',
            onOk: async () => {
                setBusy(true);
                try {
                    await resetGeoserver();
                    message.success('Cachés de GeoServer vaciadas');
                } catch (err) {
                    message.error(err?.response?.data?.detail || 'No se pudo hacer el reset');
                } finally {
                    setBusy(false);
                }
            },
        });
    };

    return (
        <>
            {mosaic?.manageable && (
                <Button icon={<SyncOutlined />} loading={busy} onClick={confirmReindex}>
                    Reindexar mosaico
                </Button>
            )}
            <Button icon={<ReloadOutlined />} disabled={busy} onClick={confirmReset}>
                Reset
            </Button>
        </>
    );
}
