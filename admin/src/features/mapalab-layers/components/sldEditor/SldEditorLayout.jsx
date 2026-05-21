import { Card, Col, Row, Space } from 'antd';
import BoundaryEditor from './BoundaryEditor';
import ChoroplethEditor from './ChoroplethEditor';
import PointEditor from './PointEditor';
import LegendPreview from './LegendPreview';
import DiffPanel from './DiffPanel';
import BorradorPreview from './BorradorPreview';
import SldActionsCard from './SldActionsCard';

export default function SldEditorLayout({
    shape,
    model,
    setModel,
    availableFields,
    data,
    workspace,
    styleName,
    layerName,
    reviewMode,
    sidebarProps,
}) {
    return (
        <Row gutter={24}>
            <Col xs={24} lg={16}>
                <Card size="small">
                    {shape === 'boundary' ? (
                        <BoundaryEditor model={model} onChange={setModel} availableFields={availableFields} />
                    ) : shape === 'point' ? (
                        <PointEditor model={model} onChange={setModel} availableFields={availableFields} />
                    ) : (
                        <ChoroplethEditor model={model} onChange={setModel} />
                    )}
                </Card>
            </Col>
            <Col xs={24} lg={8}>
                <div style={{ position: 'sticky', top: 0 }}>
                    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                        {reviewMode && <BorradorPreview shape={shape} model={model} />}
                        <LegendPreview
                            workspace={workspace}
                            geoserverWorkspace={data.workspace}
                            styleName={styleName}
                            layerName={layerName}
                        />
                        {shape === 'choropleth' && (
                            <Card size="small" title="Cambios pendientes">
                                <DiffPanel baseline={data.model} current={model} />
                            </Card>
                        )}
                        <SldActionsCard {...sidebarProps} />
                    </Space>
                </div>
            </Col>
        </Row>
    );
}
