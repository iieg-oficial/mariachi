import { Typography } from 'antd';

const { Text } = Typography;

const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, alignItems: 'start' };
const COLUMN = { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 };

export default function SideBySide({ antes, despues }) {
    return (
        <div style={GRID}>
            <div style={COLUMN}>
                <Text type="secondary">Hoy en el visor</Text>
                {antes}
            </div>
            <div style={COLUMN}>
                <Text type="secondary">Este borrador</Text>
                {despues}
            </div>
        </div>
    );
}
