import { Form, Input, Select, Button, Typography, Space } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { BLOCK_CONFIG } from '@features/portal-pages/constants/pageConstants';
import { useEffect } from 'react';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function BlockEditorForm({ block, onChange }) {
    const [form] = Form.useForm();
    const config = block ? BLOCK_CONFIG[block.type] : null;

    useEffect(() => {
        if (block) {
            form.setFieldsValue(block.props);
        }
    }, [block, form]);

    if (!block || !config) return null;

    const handleValuesChange = (changedValues, allValues) => {
        onChange(allValues);
    };

    const renderField = (field) => {
        const commonProps = {
            placeholder: field.label,
        };

        switch (field.type) {
            case 'text':
                return <Input {...commonProps} />;
            case 'textarea':
                return <TextArea rows={4} {...commonProps} />;
            case 'number':
                return <Input type="number" {...commonProps} />;
            case 'select':
                return (
                    <Select {...commonProps}>
                        {field.options.map(opt => (
                            <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                        ))}
                    </Select>
                );
            case 'image':
                return (
                    <Input prefix={<UploadOutlined />} placeholder="URL de la imagen" />
                );
            case 'boolean':
                return (
                    <Select>
                        <Option value={true}>Sí</Option>
                        <Option value={false}>No</Option>
                    </Select>
                );
            case 'rich-text':
                return <TextArea rows={6} placeholder="Contenido HTML" />;
            case 'list':
                return (
                    <Form.List name={field.name}>
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start', border: '1px dashed #d9d9d9', padding: 8, borderRadius: 4 }}>
                                        <div style={{ flex: 1 }}>
                                            {field.itemSchema && field.itemSchema.map(itemField => (
                                                <Form.Item
                                                    {...restField}
                                                    key={itemField.name}
                                                    name={[name, itemField.name]}
                                                    label={itemField.label}
                                                    rules={[{ required: itemField.required }]}
                                                    style={{ marginBottom: 8 }}
                                                >
                                                    {itemField.type === 'textarea' ? <TextArea rows={2} placeholder={itemField.label} /> : <Input placeholder={itemField.label} />}
                                                </Form.Item>
                                            ))}
                                        </div>
                                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                                    </div>
                                ))}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    Agregar Item
                                </Button>
                            </>
                        )}
                    </Form.List>
                );
            default:
                return <Input {...commonProps} />;
        }
    };

    return (
        <div style={{ background: '#fff', padding: 16, borderTop: '1px solid #f0f0f0' }}>
            <div style={{ marginBottom: 16 }}>
                <Text type="secondary">{config.description}</Text>
            </div>

            <Form
                form={form}
                layout="vertical"
                onValuesChange={handleValuesChange}
                initialValues={block.props}
            >
                {config.schema && config.schema.map(field => (
                    <Form.Item
                        key={field.name}
                        name={field.name}
                        label={field.label}
                        rules={[{ required: field.required, message: `Ingrese ${field.label}` }]}
                    >
                        {renderField(field)}
                    </Form.Item>
                ))}
            </Form>
        </div>
    );
}
