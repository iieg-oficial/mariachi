import { Button, Card, Popconfirm, Space, Typography } from 'antd';
import RawXmlFallback from './RawXmlFallback';
import { emptyModelForShape } from './sldEditorHelpers';

export default function SldNotEditableFallback({
    data,
    workspace,
    styleName,
    layerName,
    setShape,
    setModel,
    setForcedEditable,
}) {
    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <RawXmlFallback
                rawXml={data.rawXml}
                reason={data.reason}
                workspace={workspace}
                styleName={styleName}
                layerName={layerName}
            />
            <Card size="small" title="Empezar desde cero">
                <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        El SLD actual no es editable visualmente. Puedes reemplazarlo con un nuevo
                        estilo desde cero — esto descartará el SLD existente al aprobarse el borrador.
                    </Typography.Text>
                    <Popconfirm
                        title="Reemplazar el estilo con simbología de punto"
                        description="Se generará un nuevo SLD con PointSymbolizer (emoji o imagen del catálogo). El SLD actual será sobreescrito al aprobarse el borrador."
                        okText="Empezar"
                        cancelText="Cancelar"
                        onConfirm={() => {
                            setShape('point');
                            setModel(emptyModelForShape('point', layerName, styleName));
                            setForcedEditable(true);
                        }}
                    >
                        <Button type="primary">Crear simbología de punto (emoji / imagen)</Button>
                    </Popconfirm>
                </Space>
            </Card>
        </Space>
    );
}
