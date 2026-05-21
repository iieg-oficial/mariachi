import { Alert, Button, Card, Space, Statistic } from 'antd';

export default function ResultView({ result, onAgain }) {
    return (
        <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Alert
                    type="success"
                    message="Ingesta aplicada"
                    description={`Aplicada por ${result.appliedBy} el ${new Date(result.appliedAt).toLocaleString()}`}
                    showIcon
                />
                <Space size="large" wrap>
                    <Statistic title="Metadata insertados" value={result.metadataInserts} />
                    <Statistic title="Metadata actualizados" value={result.metadataUpdates} />
                    <Statistic title="Stats insertados" value={result.statsInserts} />
                    <Statistic title="Stats actualizados" value={result.statsUpdates} />
                    <Statistic
                        title="Conflictos"
                        value={result.conflicts?.length || 0}
                        valueStyle={{ color: result.conflicts?.length ? '#cf1322' : undefined }}
                    />
                </Space>
                {result.conflicts?.length > 0 && (
                    <Alert
                        type="warning"
                        message="Conflictos optimistas (otro write ocurrió mientras se generaba el plan)"
                        description={result.conflicts.join(', ')}
                        showIcon
                        closable
                    />
                )}
                <Button type="primary" onClick={onAgain}>Nueva ingesta</Button>
            </Space>
        </Card>
    );
}
