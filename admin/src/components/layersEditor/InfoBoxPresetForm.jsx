import { Form, Input, InputNumber, Select, Typography } from 'antd';

const { Text } = Typography;

const PRESET_FIELDS = {
    municipio: [
        { name: ['infoboxParams', 'title'], label: 'Campo para el título', placeholder: 'nombre' },
        { name: ['infoboxParams', 'municipio'], label: 'Campo para el municipio', placeholder: 'nombre' },
        { name: ['infoboxParams', 'text'], label: 'Texto adicional', type: 'textarea' },
        { name: ['infoboxParams', 'columns'], label: 'Columnas para stats', type: 'number', min: 1, max: 4 },
    ],
    punto: [
        { name: ['infoboxParams', 'title'], label: 'Campo para el título', placeholder: 'nombre' },
        { name: ['infoboxParams', 'caracteristica'], label: 'Campo para la característica', placeholder: 'tipo' },
    ],
    punto_municipio: [
        { name: ['infoboxParams', 'title'], label: 'Campo para el título', placeholder: 'nombre' },
        { name: ['infoboxParams', 'municipio'], label: 'Campo para el municipio', placeholder: 'municipio' },
        { name: ['infoboxParams', 'caracteristica'], label: 'Campo para la característica', placeholder: 'tipo' },
    ],
    punto_ubicacion: [
        { name: ['infoboxParams', 'title'], label: 'Campo para el título', placeholder: 'nombre' },
        { name: ['infoboxParams', 'municipio'], label: 'Campo para el municipio', placeholder: 'municipio' },
        { name: ['infoboxParams', 'caracteristicas'], label: 'Características (lista de campos)', type: 'tags' },
        { name: ['infoboxParams', 'list'], label: 'Campos de lista', type: 'tags' },
        { name: ['infoboxParams', 'iconTexts'], label: 'Campos con icono', type: 'tags' },
    ],
    punto_completo: [
        { name: ['infoboxParams', 'title'], label: 'Campo para el título', placeholder: 'nombre' },
        { name: ['infoboxParams', 'municipio'], label: 'Campo para el municipio', placeholder: 'municipio' },
        { name: ['infoboxParams', 'caracteristicas'], label: 'Características (lista de campos)', type: 'tags' },
        { name: ['infoboxParams', 'list'], label: 'Campos de lista', type: 'tags' },
        { name: ['infoboxParams', 'iconTexts'], label: 'Campos con icono', type: 'tags' },
        { name: ['infoboxParams', 'text'], label: 'Texto adicional', type: 'textarea' },
    ],
};


export default function InfoBoxPresetForm({ template }) {
    if (!template || template === 'custom') return null;
    const fields = PRESET_FIELDS[template];
    if (!fields) {
        return <Text type="secondary">Preset no reconocido: {template}</Text>;
    }

    return (
        <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Los nombres de campo deben existir en las propiedades del feature (case-sensitive).
            </Text>
            {fields.map((f) => (
                <Form.Item key={f.name.join('.')} name={f.name} label={f.label}>
                    {f.type === 'textarea' ? (
                        <Input.TextArea rows={2} placeholder={f.placeholder} />
                    ) : f.type === 'number' ? (
                        <InputNumber min={f.min} max={f.max} />
                    ) : f.type === 'tags' ? (
                        <Select mode="tags" placeholder="Escribe y pulsa Enter" tokenSeparators={[',']} />
                    ) : (
                        <Input placeholder={f.placeholder} />
                    )}
                </Form.Item>
            ))}
        </>
    );
}
