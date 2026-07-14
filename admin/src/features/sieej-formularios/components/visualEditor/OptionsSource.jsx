import { useEffect } from 'react';
import { Button, Form, Input, Segmented, Space, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import CatalogPicker from './CatalogPicker';

const SI_NO = [
    { label: 'Sí', value: 'true' },
    { label: 'No', value: 'false' },
];

export default function OptionsSource({ form }) {
    const source = Form.useWatch('option_source', form);

    useEffect(() => {
        if (source === 'catalog') form.setFieldsValue({ options_list: [] });
        else if (source === 'options') form.setFieldsValue({ catalog: undefined });
    }, [source, form]);

    return (
        <>
            <Form.Item
                label="Origen de las opciones"
                name="option_source"
                extra={source === 'catalog'
                    ? 'Lista global compartida entre formularios. Se edita desde Catálogos, sin tocar el formulario.'
                    : 'Lista propia de este campo. Queda congelada en los envíos que ya iniciaron.'}
            >
                <Segmented
                    options={[
                        { value: 'options', label: 'Lista fija' },
                        { value: 'catalog', label: 'Catálogo' },
                    ]}
                />
            </Form.Item>

            {source === 'catalog' ? (
                <CatalogPicker form={form} />
            ) : (
                <Form.Item label="Opciones">
                    <Form.List name="options_list">
                        {(rows, { add, remove }) => (
                            <>
                                {rows.length > 0 && (
                                    <div style={{
                                        display: 'flex',
                                        gap: 8,
                                        marginBottom: 4,
                                        fontSize: 12,
                                        color: '#888',
                                    }}>
                                        <span style={{ flex: 1 }}>Lo que ve quien responde</span>
                                        <span style={{ flex: 1 }}>Lo que se guarda</span>
                                        <span style={{ width: 32 }} />
                                    </div>
                                )}

                                {rows.map(({ key, name, ...rest }) => (
                                    <div
                                        key={key}
                                        style={{ display: 'flex', gap: 8, marginBottom: 8 }}
                                    >
                                        <Form.Item
                                            {...rest}
                                            name={[name, 'label']}
                                            rules={[{ required: true, message: 'Falta la etiqueta' }]}
                                            style={{ flex: 1, marginBottom: 0 }}
                                        >
                                            <Input placeholder="Sí" />
                                        </Form.Item>
                                        <Form.Item
                                            {...rest}
                                            name={[name, 'value']}
                                            rules={[{ required: true, message: 'Falta el valor' }]}
                                            style={{ flex: 1, marginBottom: 0 }}
                                        >
                                            <Input placeholder="true" />
                                        </Form.Item>
                                        <Tooltip title="Quitar opción">
                                            <Button
                                                icon={<DeleteOutlined />}
                                                onClick={() => remove(name)}
                                            />
                                        </Tooltip>
                                    </div>
                                ))}

                                <Space>
                                    <Button
                                        type="dashed"
                                        icon={<PlusOutlined />}
                                        onClick={() => add({ label: '', value: '' })}
                                    >
                                        Agregar opción
                                    </Button>
                                    {rows.length === 0 && (
                                        <Button
                                            type="link"
                                            onClick={() => SI_NO.forEach((o) => add(o))}
                                        >
                                            Usar Sí / No
                                        </Button>
                                    )}
                                </Space>
                            </>
                        )}
                    </Form.List>
                </Form.Item>
            )}
        </>
    );
}
