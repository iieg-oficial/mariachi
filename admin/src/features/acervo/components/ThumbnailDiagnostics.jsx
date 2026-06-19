import { useState, useEffect, useCallback } from 'react';
import { Card, Select, Button, Space, Typography, Tag, Row, Col, Image, Statistic, Empty, Spin, Alert, Table } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import acervoService from '@features/acervo/api/acervoService';

const { Text } = Typography;

const MAX_ITEMS = 16;
const WIDTHS = [120, 400, 1280];
const CONCURRENCY = 6;

const Box = ({ label, src }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>{label}</div>
        <div style={{
            width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', margin: '0 auto',
        }}>
            <Image src={src} width={120} height={120} style={{ objectFit: 'contain' }} preview={{ src }} />
        </div>
    </div>
);

const VARIANT_COLUMNS = [
    { title: 'Variante', dataIndex: 'variante', key: 'variante', width: 90, render: (v) => <Text strong>{v}</Text> },
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 110, render: (v) => v ? <Tag color={v.includes('webp') ? 'blue' : (v.includes('svg') ? 'purple' : 'default')}>{v}</Tag> : <Tag>—</Tag> },
    { title: 'Peso', dataIndex: 'peso', key: 'peso', width: 90 },
    { title: '% orig.', dataIndex: 'pct', key: 'pct', width: 80, render: (v) => v == null ? '—' : <Text type={v <= 25 ? 'success' : (v >= 100 ? 'danger' : undefined)}>{v}%</Text> },
    {
        title: 'URL',
        dataIndex: 'url',
        key: 'url',
        render: (url) => (
            <Text copyable={{ text: url }} ellipsis style={{ maxWidth: 280, fontSize: 11 }}>{url}</Text>
        ),
    },
];


export default function ThumbnailDiagnostics() {
    const [buckets, setBuckets] = useState([]);
    const [bucketId, setBucketId] = useState(null);
    const [images, setImages] = useState([]);
    const [probes, setProbes] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        acervoService.getBuckets().then((bs) => {
            setBuckets(bs || []);
            if (bs && bs.length > 0) setBucketId((prev) => prev ?? bs[0].id);
        }).catch(() => { /* noop */ });
    }, []);

    const load = useCallback(async () => {
        if (!bucketId) return;
        setLoading(true);
        setProbes({});
        try {
            const data = await acervoService.getAcervoFiles({ bucketId, recursive: true });
            const imgs = (data || [])
                // Solo raster: los SVG pasan tal cual (vectorial), no se comprimen.
                .filter((f) => !f.isDir && f.type?.startsWith('image/') && !f.type.includes('svg'))
                .slice(0, MAX_ITEMS);
            setImages(imgs);
            const jobs = [];
            imgs.forEach((f) => WIDTHS.forEach((w) => {
                jobs.push(async () => {
                    const url = acervoService.thumbVariant(f, w);
                    try {
                        const res = await fetch(url, { credentials: 'include' });
                        const blob = await res.blob();
                        setProbes((p) => ({
                            ...p,
                            [`${f.id}|${w}`]: {
                                status: res.ok ? 'ok' : 'error',
                                code: res.status,
                                contentType: res.headers.get('content-type'),
                                bytes: blob.size,
                            },
                        }));
                    } catch {
                        setProbes((p) => ({ ...p, [`${f.id}|${w}`]: { status: 'error' } }));
                    }
                });
            }));
            // Pool de concurrencia: corre como máximo CONCURRENCY sondas a la vez
            // para no disparar el rate limit del gateway con buckets grandes.
            let cursor = 0;
            const runNext = async () => {
                while (cursor < jobs.length) {
                    const job = jobs[cursor++];
                    await job();
                }
            };
            await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, runNext));
        } finally {
            setLoading(false);
        }
    }, [bucketId]);

    useEffect(() => { load(); }, [load]);

    const probeVals = Object.values(probes);
    const okCount = probeVals.filter((p) => p.status === 'ok').length;
    const webpCount = probeVals.filter((p) => p.contentType?.includes('webp')).length;
    const errCount = probeVals.filter((p) => p.status === 'error').length;

    const buildRows = (f) => {
        const origBytes = f.size || 0;
        const rows = [{
            key: 'orig',
            variante: 'Original',
            tipo: f.type,
            peso: acervoService.formatFileSize(origBytes),
            pct: 100,
            url: acervoService.toPublicUrl(f.url),
        }];
        WIDTHS.forEach((w) => {
            const probe = probes[`${f.id}|${w}`];
            const bytes = probe?.bytes;
            rows.push({
                key: `w${w}`,
                variante: `w=${w}`,
                tipo: probe?.contentType,
                peso: probe?.status === 'error' ? 'error' : (bytes != null ? acervoService.formatFileSize(bytes) : '…'),
                pct: (bytes != null && origBytes > 0) ? Math.round((bytes / origBytes) * 100) : null,
                url: acervoService.toPublicUrl(acervoService.thumbVariant(f, w)),
            });
        });
        return rows;
    };

    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
                <Select
                    style={{ minWidth: 220 }}
                    value={bucketId}
                    onChange={setBucketId}
                    options={buckets.map((b) => ({ value: b.id, label: b.display_name }))}
                    placeholder="Bucket"
                />
                <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Recargar</Button>
            </Space>

            <Row gutter={16}>
                <Col><Statistic title={`Imágenes (máx ${MAX_ITEMS})`} value={images.length} /></Col>
                <Col><Statistic title="Variantes OK" value={okCount} /></Col>
                <Col><Statistic title="WebP" value={webpCount} /></Col>
                <Col><Statistic title="Con error" value={errCount} valueStyle={errCount ? { color: '#cf1322' } : undefined} /></Col>
            </Row>

            {errCount > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    message="Hay variantes con error"
                    description="Si el backend no tiene Pillow o no se reconstruyó la imagen mariachi-api, el endpoint responde 502. Reconstruye la imagen del API y reintenta."
                />
            )}

            <Spin spinning={loading}>
                {images.length === 0 ? (
                    <Empty description="No hay imágenes en este bucket" />
                ) : (
                    <Row gutter={[16, 16]}>
                        {images.map((f) => (
                            <Col key={f.id} xs={24} xl={12}>
                                <Card size="small" title={<span style={{ fontSize: 12, wordBreak: 'break-all' }}>{f.originalName}</span>}>
                                    <Space size={8} wrap style={{ justifyContent: 'center', width: '100%', marginBottom: 12 }}>
                                        <Box label="Original" src={acervoService.toPublicUrl(f.url)} />
                                        <Box label="w=120" src={acervoService.thumbVariant(f, 120)} />
                                        <Box label="w=400" src={acervoService.thumbVariant(f, 400)} />
                                    </Space>
                                    <Table
                                        rowKey="key"
                                        size="small"
                                        pagination={false}
                                        dataSource={buildRows(f)}
                                        columns={VARIANT_COLUMNS}
                                    />
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
            </Spin>
        </Space>
    );
}
