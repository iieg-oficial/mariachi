import { useEffect, useMemo } from 'react';
import { Space, Typography } from 'antd';
import useIsMobile from '@shared/hooks/useIsMobile';
import { clearPreviewCache } from '@features/sextante/hooks/useStylePreview';
import { draftToRow } from '@features/sextante/utils/stylesBatchTable';
import { Legend, MapImage } from './PreviewCard';

const { Text } = Typography;

export default function DraftPreview({ borrador }) {
    const { isMobile } = useIsMobile();
    const row = useMemo(() => draftToRow(borrador), [borrador]);
    useEffect(() => clearPreviewCache, []);
    const columns = isMobile ? 'minmax(0, 1fr)' : `minmax(0, 1fr) minmax(0, 1fr)${row.xml ? '' : ' auto'}`;
    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{borrador.resource_id}</Text>
            <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 16, alignItems: 'start' }}>
                <MapImage alias={row.alias} layerName={row.layer_name} row={null} caption="Hoy en el visor" />
                <MapImage alias={row.alias} layerName={row.layer_name} row={row} caption="Este borrador" />
                {!row.xml && <Legend row={row} />}
            </div>
        </Space>
    );
}
