import { Form, Input, Space, Tabs } from 'antd';
import RangesEditor from './RangesEditor';
import PalettePicker from './PalettePicker';
import StrokeEditor from './StrokeEditor';
import NullStyleEditor from './NullStyleEditor';

export default function ChoroplethEditor({ model, onChange }) {
    const update = (patch) => onChange?.({ ...model, ...patch });

    return (
        <Tabs
            defaultActiveKey="ranges"
            items={[
                {
                    key: 'ranges',
                    label: 'Cortes y etiquetas',
                    children: (
                        <RangesEditor
                            cortes={model.cortes || []}
                            labels={model.labels || []}
                            onChange={({ cortes, labels }) => {
                                const desiredLen = labels.length;
                                const colors = (model.colors || []).slice(0, desiredLen);
                                while (colors.length < desiredLen) colors.push('#CCCCCC');
                                onChange?.({ ...model, cortes, labels, colors });
                            }}
                        />
                    ),
                },
                {
                    key: 'palette',
                    label: 'Paleta',
                    children: (
                        <PalettePicker
                            colors={model.colors || []}
                            nClasses={(model.labels || []).length}
                            onChange={(colors) => update({ colors })}
                        />
                    ),
                },
                {
                    key: 'stroke',
                    label: 'Borde',
                    children: (
                        <StrokeEditor
                            value={model.stroke || {}}
                            onChange={(stroke) => update({ stroke })}
                        />
                    ),
                },
                {
                    key: 'null',
                    label: 'Valor nulo',
                    children: (
                        <NullStyleEditor
                            value={model.null_style}
                            onChange={(null_style) => update({ null_style })}
                        />
                    ),
                },
                {
                    key: 'metadata',
                    label: 'Metadatos',
                    children: (
                        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                            <Form.Item label="Título del estilo" style={{ marginBottom: 8 }}>
                                <Input
                                    value={model.style_title || ''}
                                    onChange={(e) => update({ style_title: e.target.value })}
                                />
                            </Form.Item>
                            <Form.Item label="Atributo (campo numérico)" style={{ marginBottom: 8 }}>
                                <Input
                                    value={model.attribute || ''}
                                    onChange={(e) => update({ attribute: e.target.value })}
                                    placeholder="tasa_carpetas_investigacion"
                                />
                            </Form.Item>
                            <Form.Item label="Unidades" style={{ marginBottom: 8 }} extra="Se serializa como Abstract: 'Unidades: <texto>'">
                                <Input
                                    value={model.units || ''}
                                    onChange={(e) => {
                                        const units = e.target.value;
                                        update({
                                            units,
                                            style_abstract: units ? `Unidades: ${units}` : '',
                                        });
                                    }}
                                />
                            </Form.Item>
                        </Space>
                    ),
                },
            ]}
        />
    );
}
