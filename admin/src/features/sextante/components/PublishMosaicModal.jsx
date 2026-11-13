import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Modal, Select, Space, Table, Typography } from 'antd';
import { CheckCircleTwoTone, CloseCircleTwoTone } from '@ant-design/icons';
import TituloConAyuda from '@shared/components/TituloConAyuda';
import { message } from '@shared/services/message';
import { inspectMosaicFolder, publishMosaic } from '@features/sextante/api/mosaicService';

const { Text } = Typography;

const AYUDA_FECHA = 'GeoServer lee la fecha del final del nombre, sin la extensión. Todos los .tif '
    + 'deben seguir el mismo patrón; los que no lo sigan bloquean la publicación.';

const defaultWorkspace = (path, workspaces) => {
    const match = /^workspaces\/([^/]+)\//.exec(path || '');
    if (match) return match[1];
    const names = workspaces.map((w) => w.geoserverWorkspace);
    return names.includes('raster') ? 'raster' : names[0];
};

const Check = ({ ok, children }) => (
    <Space size={8}>
        {ok
            ? <CheckCircleTwoTone twoToneColor="#52c41a" />
            : <CloseCircleTwoTone twoToneColor="#ff4d4f" />}
        <Text>{children}</Text>
    </Space>
);

function PublishResult({ result }) {
    return (
        <Space orientation="vertical" size={6}>
            <Check ok>Properties escritos con fecha {result.format}</Check>
            <Check ok>Store {result.workspace}:{result.store} creado</Check>
            <Check ok>Dimensión TIME activa · MAXIMUM</Check>
            <Check ok={result.periods > 0}>
                {result.periods} periodo(s) · {result.first ?? '—'} → {result.last ?? '—'}
            </Check>
            <Check ok={result.advertised}>La GetCapabilities anuncia TIME</Check>
        </Space>
    );
}

const COLUMNS = [
    { title: 'Archivo', dataIndex: 'name', key: 'name', ellipsis: true },
    {
        title: 'Fecha leída',
        dataIndex: 'date',
        key: 'date',
        width: 140,
        render: (v) => (v ? v : <Text type="danger">✕ sin fecha</Text>),
    },
];

export default function PublishMosaicModal({ open, path, workspaces, onClose, onPublished }) {
    const navigate = useNavigate();
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [format, setFormat] = useState(null);
    const [workspace, setWorkspace] = useState(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!open) return undefined;
        let alive = true;
        setInfo(null);
        setResult(null);
        setLoading(true);
        setWorkspace(defaultWorkspace(path, workspaces));
        inspectMosaicFolder(path)
            .then((data) => {
                if (!alive) return;
                setInfo(data);
                setFormat(data.suggested_format || data.formats[0]?.format);
            })
            .catch((err) => {
                if (alive) message.error(err?.response?.data?.detail || 'No se pudo leer la carpeta');
            })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [open, path, workspaces]);

    const rows = useMemo(() => {
        const dates = info?.formats.find((f) => f.format === format)?.dates || {};
        return (info?.rasters || []).map((name) => ({ name, date: dates[name] }));
    }, [info, format]);

    const unmatched = rows.filter((r) => !r.date).length;
    const hasProperties = info && (info.has_properties.indexer || info.has_properties.timeregex);

    const submit = async () => {
        setBusy(true);
        try {
            const data = await publishMosaic({ workspace, path, dateFormat: format });
            setResult(data);
            onPublished?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo publicar el mosaico');
        } finally {
            setBusy(false);
        }
    };

    const footer = result
        ? [
            <Button key="capas" shape="round" onClick={() => navigate('/mapalab/layers')}>
                Ir a capas de mapalab
            </Button>,
            <Button key="cerrar" type="primary" shape="round" onClick={onClose}>Cerrar</Button>,
        ]
        : [
            <Button key="cancelar" shape="round" onClick={onClose}>Cancelar</Button>,
            <Button
                key="publicar"
                type="primary"
                shape="round"
                loading={busy}
                disabled={!info || !workspace || rows.length === 0 || unmatched > 0}
                onClick={submit}
            >
                Publicar
            </Button>,
        ];

    return (
        <Modal
            open={open}
            title={result ? `Mosaico ${result.store} publicado` : 'Publicar mosaico temporal'}
            width={640}
            onCancel={onClose}
            footer={footer}
            destroyOnHidden
        >
            {result ? <PublishResult result={result} /> : (
                <Form layout="vertical" disabled={loading || busy}>
                    <Form.Item label="Workspace">
                        <Select
                            value={workspace}
                            onChange={setWorkspace}
                            options={workspaces.map((w) => ({
                                value: w.geoserverWorkspace,
                                label: w.alias && w.alias !== w.geoserverWorkspace
                                    ? `${w.alias} · ${w.geoserverWorkspace}`
                                    : w.geoserverWorkspace,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item label="Capa" extra="Toma el nombre de la carpeta.">
                        <Text code>{info?.store || '—'}</Text>
                    </Form.Item>
                    <Form.Item
                        label={<TituloConAyuda titulo="Fecha en el nombre" ayuda={AYUDA_FECHA} />}
                        extra={hasProperties
                            ? 'Se reemplazan indexer.properties y timeregex.properties de la carpeta.'
                            : undefined}
                    >
                        <Select
                            value={format}
                            onChange={setFormat}
                            options={(info?.formats || []).map((f) => ({
                                value: f.format,
                                label: `${f.example}  (${f.format})`,
                            }))}
                        />
                    </Form.Item>
                    <Table
                        dataSource={rows}
                        columns={COLUMNS}
                        rowKey="name"
                        size="small"
                        loading={loading}
                        pagination={rows.length > 8 ? { pageSize: 8, size: 'small' } : false}
                    />
                    <Text type={unmatched > 0 ? 'danger' : 'secondary'}>
                        {rows.length - unmatched} de {rows.length} archivo(s) con fecha
                    </Text>
                </Form>
            )}
        </Modal>
    );
}
