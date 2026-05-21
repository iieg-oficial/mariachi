import {
    Alert,
    Badge,
    Button,
    Card,
    Collapse,
    Descriptions,
    Empty,
    Space,
    Spin,
    Statistic,
    Tag,
    Typography,
} from 'antd';
import { CloseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import ChangeDetail from '@features/mapalab-layers/components/bulkIngest/ChangeDetail';

const { Text } = Typography;

export default function PreviewPlan({ plan, onApply, onCancel, applying }) {
    const stats = plan.plan.stats;
    const unknownHeaders = plan.unknownHeaders || [];

    return (
        <Spin spinning={applying} tip="Aplicando…">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Card>
                    <Descriptions column={2} size="small">
                        <Descriptions.Item label="Archivo">{plan.plan.sourceFilename}</Descriptions.Item>
                        <Descriptions.Item label="Dependencia">{plan.plan.dependencia}</Descriptions.Item>
                        <Descriptions.Item label="Plan ID"><Text code>{plan.planId}</Text></Descriptions.Item>
                        <Descriptions.Item label="Expira">{new Date(plan.expiresAt).toLocaleString()}</Descriptions.Item>
                    </Descriptions>
                    {unknownHeaders.length > 0 && (
                        <Alert
                            type="warning"
                            message="Columnas del archivo sin mapear (se ignoraron)"
                            description={unknownHeaders.join(', ')}
                            showIcon
                            closable
                            style={{ marginTop: 12 }}
                        />
                    )}
                </Card>

                <Card title="Resumen del plan">
                    <Space size="large" wrap>
                        <Statistic title="Filas en archivo" value={stats.rowsInSource} />
                        <Statistic title="Únicas con PK" value={stats.rowsUnique} />
                        <Statistic
                            title="Sin PK"
                            value={stats.rowsMissingPk}
                            valueStyle={{ color: stats.rowsMissingPk ? '#cf1322' : undefined }}
                        />
                        <Statistic
                            title="Duplicadas"
                            value={stats.rowsDuplicatePk}
                            valueStyle={{ color: stats.rowsDuplicatePk ? '#d48806' : undefined }}
                        />
                        <Statistic title="Inserts (metadata)" value={stats.inserts} valueStyle={{ color: '#52c41a' }} />
                        <Statistic title="Updates (metadata)" value={stats.updates} valueStyle={{ color: '#1677ff' }} />
                        <Statistic title="Inserts (numeralia)" value={stats.statsInserts} valueStyle={{ color: '#52c41a' }} />
                        <Statistic title="Updates (numeralia)" value={stats.statsUpdates} valueStyle={{ color: '#1677ff' }} />
                    </Space>
                </Card>

                <Card title={`Cambios (${plan.plan.changes.length})`}>
                    {plan.plan.changes.length === 0 ? (
                        <Empty description="No hay cambios — el archivo coincide con la BD" />
                    ) : (
                        <Collapse
                            items={plan.plan.changes.map((ch, idx) => ({
                                key: idx,
                                label: (
                                    <Space>
                                        <Badge
                                            status={ch.op === 'insert' ? 'success' : 'processing'}
                                            text={ch.op === 'insert' ? 'INSERT' : 'UPDATE'}
                                        />
                                        <Text strong>{ch.layerKey}</Text>
                                        {ch.diffs?.length > 0 && (
                                            <Tag color="blue">{ch.diffs.length} cambio(s)</Tag>
                                        )}
                                    </Space>
                                ),
                                children: <ChangeDetail change={ch} />,
                            }))}
                        />
                    )}
                </Card>

                <Card>
                    <Space>
                        <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            size="large"
                            onClick={onApply}
                            disabled={plan.plan.changes.length === 0}
                        >
                            Aplicar a la BD
                        </Button>
                        <Button icon={<CloseCircleOutlined />} onClick={onCancel} size="large">
                            Cancelar plan
                        </Button>
                    </Space>
                </Card>
            </Space>
        </Spin>
    );
}
