import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

export default function InfoIcon({ title, style }) {
    if (!title) return null;
    return (
        <Tooltip title={title} trigger={['hover', 'click', 'focus']}>
            <InfoCircleOutlined
                tabIndex={0}
                aria-label="Más información"
                style={{ color: '#7385ab', fontSize: 13, cursor: 'help', flexShrink: 0, ...style }}
            />
        </Tooltip>
    );
}
