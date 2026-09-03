import { Typography } from 'antd';
import Muestrario from '@features/mel/components/previews/Muestrario';
import PanelPreview from '@features/mel/components/previews/PanelPreview';
import VisorPreview from '@features/mel/components/previews/VisorPreview';

const { Text } = Typography;

const Seccion = ({ titulo, nota, children }) => (
    <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <Text
                strong
                style={{
                    fontSize: 12,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#5C2472',
                }}
            >
                {titulo}
            </Text>
            <Text type='secondary' style={{ fontSize: 13 }}>{nota}</Text>
        </div>
        {children}
    </div>
);

export default function VistaPrevia({ tokens, seleccion, onSeleccionar, fondo, colorTexto, color }) {
    return (
        <div style={{ height: '100%', overflow: 'auto', padding: 24, background: '#f5f5f5' }}>
            <div
                style={{
                    background: '#fff',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    padding: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 32,
                }}
            >
                <Muestrario
                    tokens={tokens}
                    seleccion={seleccion}
                    onSeleccionar={onSeleccionar}
                    fondo={fondo}
                    colorTexto={colorTexto}
                />

                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 28 }}>
                    <Seccion titulo='Aplicado · panel' nota='componentes del admin con estos valores'>
                        <div style={{ height: 420 }}>
                            <PanelPreview color={color} />
                        </div>
                    </Seccion>

                    <Seccion titulo='Aplicado · visor' nota='controles y leyenda de mapalab'>
                        <div style={{ height: 320 }}>
                            <VisorPreview color={color} />
                        </div>
                    </Seccion>
                </div>
            </div>
        </div>
    );
}
