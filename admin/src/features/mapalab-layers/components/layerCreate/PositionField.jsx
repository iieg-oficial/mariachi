import { Select, Space, Typography } from 'antd';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';
import { POSICION_FINAL, POSICION_INICIO } from '@features/mapalab-layers/utils/nodoNuevo';

const { Text } = Typography;

export default function PositionField({ hermanos, value, onChange }) {
    if (!hermanos.length) return null;

    const opciones = [
        { value: POSICION_INICIO, label: 'Al principio' },
        ...hermanos.map((h) => ({ value: h.key, label: `Después de ${h.title}` })),
        { value: POSICION_FINAL, label: 'Al final' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Space size={6}>
                <Text style={{ fontSize: 13, fontWeight: 600 }}>Posición</Text>
                <InfoIcon title="El orden en que aparece entre sus hermanos, en el árbol del visor. Se puede cambiar después arrastrando." />
            </Space>
            <Select
                showSearch
                value={value}
                onChange={onChange}
                options={opciones}
                optionFilterProp="label"
                styles={{ popup: { root: { maxHeight: 320 } } }}
            />
        </div>
    );
}
