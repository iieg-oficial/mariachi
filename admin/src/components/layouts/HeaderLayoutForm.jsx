import { useState, useEffect } from 'react';
import { Card, Form, Button, message, Space, Divider } from 'antd';
import { SaveOutlined, UndoOutlined } from '@ant-design/icons';
import api from '@services/api';
import { FontConfigProvider } from '@contexts/FontConfigContext';

import BasicInfoSection from './header/BasicInfoSection';
import LogoSection from './header/LogoSection';
import ColorsSection from './header/ColorsSection';

const HeaderLayoutForm = ({ initialData, onSaved }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            form.setFieldsValue(initialData);
        }
    }, [initialData, form]);

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            await api.put('/layouts/header', values);
            message.success('Header actualizado exitosamente');
            if (onSaved) {
                onSaved();
            }
        } catch (error) {
            message.error('Error al actualizar header');
            console.error('Error saving header:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <FontConfigProvider>
            <Card>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{
                        backgroundColor: '#ffffff',
                        textColor: '#1f2937',
                        showTitle: true,
                        showSubtitle: true,
                        showNavigationMenu: true
                    }}
                >
                    <BasicInfoSection form={form} />

                    <Divider />

                    <LogoSection form={form} />

                    <Divider orientation="left">Colores</Divider>

                    <ColorsSection />

                    <Form.Item style={{ marginTop: 24 }}>
                        <Space>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SaveOutlined />}
                                loading={loading}
                                size="large"
                            >
                                Guardar Cambios
                            </Button>
                            <Button
                                icon={<UndoOutlined />}
                                onClick={() => form.resetFields()}
                            >
                                Restablecer
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </FontConfigProvider>
    );
};

export default HeaderLayoutForm;
