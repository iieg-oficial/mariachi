import { useState } from 'react';
import { Button, ColorPicker, Space, Tooltip, Typography } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import ColorRamp from './ColorRamp';

const { Text } = Typography;

const FALLBACK = '#CCCCCC';

const initialColors = (initial, classes) => (
    initial?.length ? initial : Array.from({ length: Math.max(classes, 1) }, () => FALLBACK)
);

export default function CustomRamp({ initial, classes, onPick }) {
    const [colors, setColors] = useState(() => initialColors(initial, classes));

    const setColor = (index, hex) => setColors((prev) => prev.map((c, i) => (i === index ? hex : c)));
    const remove = (index) => setColors((prev) => prev.filter((_, i) => i !== index));
    const add = () => setColors((prev) => [...prev, prev[prev.length - 1] || FALLBACK]);

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <ColorRamp colors={colors} size={22} stretch />
            <Space wrap size={[12, 8]}>
                {colors.map((color, index) => (
                    <Space key={index} size={2}>
                        <ColorPicker
                            value={color}
                            disabledAlpha
                            showText
                            onChangeComplete={(value) => setColor(index, value.toHexString().toUpperCase())}
                            aria-label={`Color ${index + 1}`}
                        />
                        {colors.length > 1 && (
                            <Tooltip title="Quitar">
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<CloseOutlined />}
                                    aria-label={`Quitar color ${index + 1}`}
                                    onClick={() => remove(index)}
                                />
                            </Tooltip>
                        )}
                    </Space>
                ))}
                <Button shape="round" icon={<PlusOutlined />} onClick={add}>Color</Button>
            </Space>
            {colors.length !== classes && (
                <Text type="warning">Hay {colors.length} colores y {classes} clases en los cortes</Text>
            )}
            <Button type="primary" shape="round" onClick={() => onPick({ colores_propios: colors.join(' ') })}>
                Usar estos colores
            </Button>
        </Space>
    );
}
