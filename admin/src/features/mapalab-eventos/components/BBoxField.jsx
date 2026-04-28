import { InputNumber, Space, Typography } from 'antd';

const { Text } = Typography;


export default function BBoxField({ value, onChange, disabled }) {
    const v = value || { minx: '', miny: '', maxx: '', maxy: '' };

    const update = (key, val) => {
        onChange?.({ ...v, [key]: val });
    };

    return (
        <Space orientation="vertical" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
                Coordenadas en EPSG:4326 (longitud/latitud). El visor hará zoom a este rectángulo al abrir el evento.
            </Text>
            <Space wrap>
                <Space orientation="vertical" size={0}>
                    <Text style={{ fontSize: 11 }}>min lon (oeste)</Text>
                    <InputNumber
                        value={v.minx}
                        onChange={(val) => update('minx', val)}
                        step={0.0001}
                        disabled={disabled}
                        style={{ width: 140 }}
                    />
                </Space>
                <Space orientation="vertical" size={0}>
                    <Text style={{ fontSize: 11 }}>min lat (sur)</Text>
                    <InputNumber
                        value={v.miny}
                        onChange={(val) => update('miny', val)}
                        step={0.0001}
                        disabled={disabled}
                        style={{ width: 140 }}
                    />
                </Space>
                <Space orientation="vertical" size={0}>
                    <Text style={{ fontSize: 11 }}>max lon (este)</Text>
                    <InputNumber
                        value={v.maxx}
                        onChange={(val) => update('maxx', val)}
                        step={0.0001}
                        disabled={disabled}
                        style={{ width: 140 }}
                    />
                </Space>
                <Space orientation="vertical" size={0}>
                    <Text style={{ fontSize: 11 }}>max lat (norte)</Text>
                    <InputNumber
                        value={v.maxy}
                        onChange={(val) => update('maxy', val)}
                        step={0.0001}
                        disabled={disabled}
                        style={{ width: 140 }}
                    />
                </Space>
            </Space>
        </Space>
    );
}
