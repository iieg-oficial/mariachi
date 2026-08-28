import { useEffect, useState } from 'react';
import { Card, Segmented, Spin, Typography } from 'antd';
import { ClusterOutlined } from '@ant-design/icons';
import { SEMANTIC } from '@app/providers/brand';
import SectionHeader from '@shared/components/SectionHeader';
import MapaNodos from '@shared/components/nodos/MapaNodos';
import NodoDetalleModal from '@shared/components/nodos/NodoDetalleModal';
import { getNodos, REFRESCO_NODOS_MS } from '@shared/services/nodosService';
import EcosistemaTablero from '@features/inicio/components/EcosistemaTablero';

const { Text } = Typography;

const VISTAS = [
    { value: 'servidores', label: 'Servidores' },
    { value: 'servicios', label: 'Servicios' },
];

export default function EcosistemaPanel({ plataformas, loading, onReportar }) {
    const [vista, setVista] = useState('servidores');
    const [nodos, setNodos] = useState({ nodos: [], aristas: [] });
    const [cargandoNodos, setCargandoNodos] = useState(true);
    const [seleccionado, setSeleccionado] = useState(null);

    useEffect(() => {
        let cancelado = false;
        const cargar = () => getNodos(0)
            .then((data) => { if (!cancelado) setNodos(data); })
            .catch(() => {})
            .finally(() => { if (!cancelado) setCargandoNodos(false); });

        cargar();
        const intervalo = setInterval(cargar, REFRESCO_NODOS_MS);
        return () => { cancelado = true; clearInterval(intervalo); };
    }, []);

    const operativas = plataformas.filter((p) => p.status === 'ok').length;
    const todas = operativas === plataformas.length && plataformas.length > 0;

    const contador = plataformas.length > 0 && (
        <Text
            style={{
                fontSize: 12,
                padding: '0 8px',
                borderRadius: 10,
                color: todas ? SEMANTIC.success : SEMANTIC.danger,
                background: todas ? SEMANTIC.successSoft : SEMANTIC.dangerSoft,
            }}
        >
            {`${operativas} / ${plataformas.length} operativos`}
        </Text>
    );

    if (vista === 'servicios') {
        return (
            <div>
                <SectionHeader
                    icon={<ClusterOutlined />}
                    title="Huachicol"
                    subtitle="Ecosistema"
                    badge={<Segmented size="small" options={VISTAS} value={vista} onChange={setVista} />}
                    to="/huachicol/observabilidad"
                    actionLabel="Ver observabilidad"
                />
                <EcosistemaTablero
                    plataformas={plataformas}
                    loading={loading}
                    onReportar={onReportar}
                    contador={contador}
                    sinEncabezado
                />
            </div>
        );
    }

    return (
        <div>
            <SectionHeader
                icon={<ClusterOutlined />}
                title="Huachicol"
                subtitle="Ecosistema"
                badge={<Segmented size="small" options={VISTAS} value={vista} onChange={setVista} />}
                to="/huachicol/servidores"
                actionLabel="Ver servidores"
            />
            <Card size="small" styles={{ body: { padding: '8px 16px 12px' } }}>
                {cargandoNodos ? (
                    <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
                ) : (
                    <MapaNodos
                        nodos={nodos.nodos}
                        aristas={nodos.aristas}
                        onSeleccionar={setSeleccionado}
                    />
                )}
            </Card>

            <NodoDetalleModal
                nodo={seleccionado}
                aristas={nodos.aristas}
                open={Boolean(seleccionado)}
                onClose={() => setSeleccionado(null)}
            />
        </div>
    );
}
