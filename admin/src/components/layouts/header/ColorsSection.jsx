import { Form, Input, Space, Typography } from 'antd';

const { Text } = Typography;

const ColorsSection = () => {
    return (
        <>
            <Form.Item
                label="Color de fondo"
                name="backgroundColor"
            >
                <Space align="center">
                    <Input
                        type="color"
                        style={{ width: 60, height: 40, padding: 4, cursor: 'pointer' }}
                    />
                    <Text type="secondary">Haz clic para cambiar el color</Text>
                </Space>
            </Form.Item>

            <Form.Item
                label="Color general de texto"
                name="textColor"
                tooltip="Color por defecto para elementos del header (si no tienen color personalizado)"
            >
                <Space align="center">
                    <Input
                        type="color"
                        style={{ width: 60, height: 40, padding: 4, cursor: 'pointer' }}
                    />
                    <Text type="secondary">Haz clic para cambiar el color</Text>
                </Space>
            </Form.Item>
        </>
    );
};

export default ColorsSection;
