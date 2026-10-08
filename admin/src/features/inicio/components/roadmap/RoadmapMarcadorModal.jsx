import { Modal, Space, Typography } from 'antd';
import { Link } from 'react-router';
import SymbolPicker from '@features/mapalab-symbols/components/SymbolPicker';

const { Text } = Typography;

export default function RoadmapMarcadorModal({ abierto, marcador, contenedor, onElegir, onCerrar }) {
    return (
        <Modal
            open={abierto}
            onCancel={onCerrar}
            getContainer={contenedor || undefined}
            footer={null}
            width={560}
            title="Quién recorre la línea"
        >
            <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Del catálogo de símbolos del ecosistema.
                    </Text>
                    <Link to="/sextante/simbolos">
                        <Text type="secondary" style={{ fontSize: 12 }}>Administrar símbolos →</Text>
                    </Link>
                </Space>
                <SymbolPicker
                    value={marcador?.id}
                    onChange={(id, simbolo) => {
                        onElegir(simbolo);
                        onCerrar();
                    }}
                />
            </Space>
        </Modal>
    );
}
