import { Dropdown, Space } from 'antd';
import {
    DownloadOutlined,
    HistoryOutlined,
    QuestionCircleOutlined,
} from '@ant-design/icons';
import GridIconButton from '@shared/components/dataGrid/GridIconButton';
import { EXPORT_ITEMS } from '@shared/components/dataGrid/exportItems';

export { ALL_FILTER_VALUES } from '@shared/components/dataGrid/GridPillSearch';

export default function GridToolbar({
    isDesktop,
    onOpenShortcuts,
    onOpenHistory,
    onExport,
    exporting,
    extra,
}) {
    return (
        <Space size={6} wrap={!isDesktop}>
            {extra}

            <Dropdown
                placement="bottomRight"
                trigger={['click']}
                menu={{ items: EXPORT_ITEMS, onClick: ({ key }) => onExport(key) }}
            >
                <GridIconButton
                    size="small"
                    type="text"
                    icon={<DownloadOutlined />}
                    label="Descargar"
                    loading={exporting}
                />
            </Dropdown>

            <GridIconButton
                size="small"
                type="text"
                icon={<HistoryOutlined />}
                label="Historial"
                onClick={onOpenHistory}
            />

            <GridIconButton
                size="small"
                type="text"
                icon={<QuestionCircleOutlined />}
                label="Atajos"
                onClick={onOpenShortcuts}
            />
        </Space>
    );
}
