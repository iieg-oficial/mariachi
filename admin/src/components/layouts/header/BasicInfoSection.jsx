import { Form, Switch, Space, Typography } from 'antd';
import PersonalizedInput from '@components/common/PersonalizedInput';

const { Text } = Typography;

const BasicInfoSection = ({ form }) => {
    return (
        <>
            <div style={{ marginBottom: 16 }}>
                <Space align="center" style={{ marginBottom: 8 }}>
                    <Form.Item
                        name="showTitle"
                        valuePropName="checked"
                        style={{ marginBottom: 0 }}
                    >
                        <Switch />
                    </Form.Item>
                    <Text strong>Mostrar Título</Text>
                </Space>
                <PersonalizedInput
                    label="Título"
                    name="title"
                    fontName="titleFont"
                    fontWeightName="titleFontWeight"
                    colorName="titleColor"
                    placeholder="Título del sitio"
                    previewText="IIEG Jalisco"
                    form={form}
                    size="large"
                />
            </div>

            <div style={{ marginBottom: 16 }}>
                <Space align="center" style={{ marginBottom: 8 }}>
                    <Form.Item
                        name="showSubtitle"
                        valuePropName="checked"
                        style={{ marginBottom: 0 }}
                    >
                        <Switch />
                    </Form.Item>
                    <Text strong>Mostrar Subtítulo</Text>
                </Space>
                <PersonalizedInput
                    label="Subtítulo"
                    name="subtitle"
                    fontName="subtitleFont"
                    fontWeightName="subtitleFontWeight"
                    colorName="subtitleColor"
                    placeholder="Subtítulo o descripción"
                    previewText="Instituto de Información Estadística y Geográfica"
                    form={form}
                />
            </div>

            <Form.Item
                label="Mostrar menú de navegación"
                name="showNavigationMenu"
                valuePropName="checked"
            >
                <Switch />
            </Form.Item>
        </>
    );
};

export default BasicInfoSection;
