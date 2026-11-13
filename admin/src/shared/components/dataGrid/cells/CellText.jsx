import { Typography } from 'antd';

const { Text } = Typography;

const STYLE = {
    width: '100%',
    padding: '0 11px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};

export default function CellText({ children }) {
    if (children === null || children === undefined || children === '') {
        return <Text type="secondary" style={STYLE}>—</Text>;
    }
    return <Text style={STYLE}>{children}</Text>;
}
