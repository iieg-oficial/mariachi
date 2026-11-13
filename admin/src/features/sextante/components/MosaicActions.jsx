import { useState } from 'react';
import { Button, Modal, Space, Typography } from 'antd';
import { ClockCircleOutlined, CloudUploadOutlined, PlusCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { enableMosaicTime, harvestMosaic, reindexMosaic } from '@features/sextante/api/mosaicService';
import PublishMosaicModal from '@features/sextante/components/PublishMosaicModal';

const { Text, Paragraph } = Typography;

const errorOf = (err, fallback) => err?.response?.data?.detail || fallback;

const reindexResult = (data) => (
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

const reindexContent = (store) => (
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
        <Paragraph style={{ marginBottom: 0 }}>
            Borra el índice del mosaico para que GeoServer lo reconstruya contra los rásters que hay
            hoy en la carpeta. Corrige una capa en negro tras reemplazar archivos o un regex cambiado.
        </Paragraph>
        <Text type="secondary">
            Se borran: el índice (<Text code>{store}.dbf</Text>, <Text code>.shp</Text>,
            {' '}<Text code>.shx</Text>, <Text code>.qix</Text>, <Text code>.fix</Text>,
            {' '}<Text code>.prj</Text>, <Text code>.properties</Text>) y
            {' '}<Text code>sample_image.dat</Text>.
        </Text>
        <Text type="secondary">
            Se conservan: los <Text code>.tif</Text>, <Text code>indexer.properties</Text> y
            {' '}<Text code>timeregex.properties</Text>. Se respalda antes de borrar y se restaura si el
            render falla.
        </Text>
    </Space>
);

export default function MosaicActions({ folder, workspaces, onDone }) {
    const { path, mosaic, status, canPublish, refresh } = folder;
    const [busy, setBusy] = useState(null);
    const [publishOpen, setPublishOpen] = useState(false);
    const manageable = Boolean(mosaic?.manageable);

    const run = async (key, action, onSuccess, fallback) => {
        setBusy(key);
        try {
            const data = await action({ workspace: mosaic.workspace, store: mosaic.store });
            onSuccess(data);
            refresh();
            onDone?.();
        } catch (err) {
            message.error(errorOf(err, fallback));
        } finally {
            setBusy(null);
        }
    };

    const confirmReindex = () => Modal.confirm({
        title: `Reindexar ${mosaic.store}`,
        width: 560,
        content: reindexContent(mosaic.store),
        okText: 'Reindexar',
        cancelText: 'Cancelar',
        okButtonProps: { shape: 'round' },
        cancelButtonProps: { shape: 'round' },
        onOk: () => run('reindex', reindexMosaic, (data) => Modal.success({
            title: `Mosaico ${mosaic.store} reindexado`,
            content: reindexResult(data),
        }), 'No se pudo reindexar el mosaico'),
    });

    const harvest = () => run('harvest', harvestMosaic, (data) => {
        if (data.failed.length) {
            message.error(`${data.failed.length} archivo(s) no se cosecharon: ${data.failed[0].error}`);
        }
        if (data.harvested.length) message.success(`${data.harvested.length} periodo(s) agregados`);
    }, 'No se pudieron cosechar los archivos nuevos');

    const activateTime = () => run('time', enableMosaicTime, (data) => {
        if (data.advertised) message.success('Dimensión TIME activa');
        else message.error('TIME activo en el coverage, pero la GetCapabilities aún no lo anuncia');
    }, 'No se pudo activar la dimensión TIME');

    const closePublish = () => {
        setPublishOpen(false);
        refresh();
        onDone?.();
    };

    return (
        <>
            {canPublish && (
                <Button shape="round" icon={<CloudUploadOutlined />} onClick={() => setPublishOpen(true)}>
                    Publicar como mosaico
                </Button>
            )}
            {manageable && status?.pending.length > 0 && (
                <Button shape="round" icon={<PlusCircleOutlined />} loading={busy === 'harvest'} onClick={harvest}>
                    Cosechar nuevos ({status.pending.length})
                </Button>
            )}
            {manageable && status && !status.time_enabled && (
                <Button shape="round" icon={<ClockCircleOutlined />} loading={busy === 'time'} onClick={activateTime}>
                    Activar TIME
                </Button>
            )}
            {manageable && (
                <Button shape="round" icon={<SyncOutlined />} loading={busy === 'reindex'} onClick={confirmReindex}>
                    Reindexar mosaico
                </Button>
            )}
            {(canPublish || publishOpen) && (
                <PublishMosaicModal
                    open={publishOpen}
                    path={path}
                    workspaces={workspaces}
                    onClose={closePublish}
                />
            )}
        </>
    );
}
