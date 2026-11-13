import { Select, Space, Typography } from 'antd';
import InfoIcon from '@features/mapalab-layers/components/layersEditor/InfoIcon';

const { Text } = Typography;

const AYUDA_CAPA = 'De aquí salen la geometría, los campos y la simbología. Un nodo sin capa de GeoServer no se dibuja en el visor. Elige varias para crear un nodo por capa.';

export default function GeoServerLayerField({ value = [], onChange, opciones, cargando }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Space size={6}>
                <Text style={{ fontSize: 13, fontWeight: 600 }}>Capas de GeoServer</Text>
                <InfoIcon title={AYUDA_CAPA} />
            </Space>
            <Select
                mode="multiple"
                showSearch
                allowClear
                loading={cargando}
                value={value}
                onChange={onChange}
                placeholder="Busca por nombre de capa o de workspace"
                options={opciones}
                optionFilterProp="label"
                maxTagCount="responsive"
                filterOption={(input, option) => {
                    if (!option?.value) return false;
                    const q = input.toLowerCase();
                    return option.label?.toLowerCase().includes(q) || option.value.toLowerCase().includes(q);
                }}
                optionRender={({ data }) => (
                    <Space size={8} style={{ justifyContent: 'space-between', width: '100%' }}>
                        <span>{data.label}</span>
                        {data.uso > 0 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>en el árbol ×{data.uso}</Text>
                        )}
                    </Space>
                )}
                notFoundContent={cargando ? 'Cargando...' : 'Sin capas disponibles'}
                styles={{ popup: { root: { maxHeight: 320 } } }}
            />
        </div>
    );
}
