import { useEffect, useState } from 'react';
import { Modal, Row, Col, Statistic, Table, Spin, Alert, Typography, Tag } from 'antd';
import { PieChartOutlined, FileImageOutlined, FilePdfOutlined, FolderOutlined, DatabaseOutlined } from '@ant-design/icons';
import acervoService from '@features/acervo/api/acervoService';

const { Text } = Typography;

export default function AcervoStatsModal({ open, onClose, isMobile }) {
    const [loading, setLoading] = useState(false);
    const [resumen, setResumen] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        setLoading(true);
        setError(false);
        acervoService.getAcervoResumen()
            .then((data) => { if (!cancelled) setResumen(data); })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open]);

    const totals = resumen?.totals;

    const columns = [
        {
            title: 'Bucket',
            dataIndex: 'displayName',
            key: 'displayName',
            ellipsis: true,
            render: (displayName, record) => (
                <div style={{ minWidth: 0 }}>
                    <Text strong ellipsis={{ tooltip: displayName }} style={{ width: '100%' }}>
                        {displayName}
                    </Text>
                    <div>
                        <Text type="secondary" style={{ fontSize: 11 }} ellipsis={{ tooltip: record.bucket }}>
                            {record.bucket}
                        </Text>
                    </div>
                    {record.error && <Tag color="red">sin lectura</Tag>}
                </div>
            ),
        },
        { title: 'Archivos', dataIndex: 'fileCount', key: 'fileCount', width: 80, align: 'right' },
        { title: 'Imágenes', dataIndex: 'imageCount', key: 'imageCount', width: 80, align: 'right', responsive: ['sm'] },
        { title: 'Docs', dataIndex: 'documentCount', key: 'documentCount', width: 70, align: 'right', responsive: ['md'] },
        { title: 'Carpetas', dataIndex: 'folderCount', key: 'folderCount', width: 80, align: 'right', responsive: ['md'] },
        {
            title: 'Tamaño',
            dataIndex: 'totalSize',
            key: 'totalSize',
            width: 90,
            align: 'right',
            render: (size) => acervoService.formatFileSize(size || 0),
        },
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={isMobile ? '100%' : 820}
            centered={isMobile}
            title={<><PieChartOutlined /> Información general del Acervo</>}
            styles={{ body: { maxHeight: '75vh', overflowY: 'auto', overflowX: 'hidden' } }}
        >
            <Spin spinning={loading}>
                {error ? (
                    <Alert type="error" showIcon title="No se pudo obtener el resumen del Acervo" />
                ) : (
                    <>
                        <Row gutter={[12, 12]}>
                            <Col xs={12} sm={6}>
                                <Statistic title="Total de archivos" value={totals?.fileCount ?? 0} />
                            </Col>
                            <Col xs={12} sm={6}>
                                <Statistic
                                    title="Tamaño del Acervo"
                                    value={acervoService.formatFileSize(totals?.totalSize || 0)}
                                />
                            </Col>
                            <Col xs={12} sm={6}>
                                <Statistic
                                    title="Carpetas"
                                    value={totals?.folderCount ?? 0}
                                    prefix={<FolderOutlined />}
                                />
                            </Col>
                            <Col xs={12} sm={6}>
                                <Statistic
                                    title="Buckets"
                                    value={totals?.bucketCount ?? 0}
                                    prefix={<DatabaseOutlined />}
                                />
                            </Col>
                        </Row>

                        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
                            <Col xs={8}>
                                <Statistic
                                    title="Imágenes"
                                    value={totals?.imageCount ?? 0}
                                    prefix={<FileImageOutlined />}
                                />
                            </Col>
                            <Col xs={8}>
                                <Statistic
                                    title="Documentos"
                                    value={totals?.documentCount ?? 0}
                                    prefix={<FilePdfOutlined />}
                                />
                            </Col>
                            <Col xs={8}>
                                <Statistic title="Otros" value={totals?.otherCount ?? 0} />
                            </Col>
                        </Row>

                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                            Última modificación:{' '}
                            {totals?.lastModified
                                ? new Date(totals.lastModified).toLocaleString('es-MX')
                                : '—'}
                        </Text>

                        <Table
                            style={{ marginTop: 16 }}
                            columns={columns}
                            dataSource={resumen?.buckets || []}
                            rowKey="bucketId"
                            size="small"
                            pagination={false}
                            tableLayout="fixed"
                        />
                    </>
                )}
            </Spin>
        </Modal>
    );
}
