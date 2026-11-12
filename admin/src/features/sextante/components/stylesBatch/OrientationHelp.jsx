import { Space, Typography, theme } from 'antd';
import ColorRamp from './ColorRamp';

const { Text } = Typography;

const examples = (token) => {
    const sequence = [token.red1, token.red3, token.red5, token.red7, token.red9];
    return [
        { icon: '↓', label: 'Menor es mejor', note: 'lo alto, intenso', colors: sequence },
        { icon: '↑', label: 'Mayor es mejor', note: 'lo bajo, intenso', colors: [...sequence].reverse() },
        {
            icon: '◎',
            label: 'Lo ideal es el centro',
            note: 'los extremos, intensos',
            colors: [token.blue8, token.blue4, token.colorFillSecondary, token.red4, token.red8],
        },
        { icon: '–', label: 'Sin juicio', note: 'la paleta tal cual', colors: sequence },
    ];
};

export default function OrientationHelp() {
    const { token } = theme.useToken();
    return (
        <Space orientation="vertical" size={8}>
            <Text style={{ color: 'inherit' }}>De menor a mayor valor:</Text>
            {examples(token).map((item) => (
                <Space key={item.icon} size={8} align="center">
                    <Text strong style={{ color: 'inherit', width: 16, display: 'inline-block' }}>{item.icon}</Text>
                    <ColorRamp colors={item.colors} />
                    <Text style={{ color: 'inherit', fontSize: 12 }}>{item.label} · {item.note}</Text>
                </Space>
            ))}
        </Space>
    );
}
