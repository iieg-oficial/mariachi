import { Segmented, Typography } from 'antd';
import PanelPreview from '@features/mel/components/previews/PanelPreview';
import VisorPreview from '@features/mel/components/previews/VisorPreview';
import ArtefactoPreview from '@features/mel/components/previews/ArtefactoPreview';

const { Text } = Typography;

const SUPERFICIES = [
    { value: 'panel', label: 'Panel' },
    { value: 'visor', label: 'Visor' },
    { value: 'qgis', label: 'QGIS' },
    { value: 'guia', label: 'design.md' },
];

const NOTAS = {
    panel: 'Componentes del admin con los valores de esta marca',
    visor: 'Controles y leyenda de mapalab',
    qgis: 'El theme.qss que lee el complemento de QGIS',
    guia: 'La guía en markdown, tal como se descarga',
};

export default function VistaPrevia({ superficie, onSuperficie, codigo, color, hayPendientes }) {
    const renderSuperficie = () => {
        switch (superficie) {
        case 'visor':
            return <VisorPreview color={color} />;
        case 'qgis':
            return (
                <ArtefactoPreview
                    codigo={codigo}
                    artefacto='tokens.qss'
                    nota='se baja con make tokens'
                    hayPendientes={hayPendientes}
                />
            );
        case 'guia':
            return (
                <ArtefactoPreview
                    codigo={codigo}
                    artefacto='design.md'
                    nota='primera hoja del ZIP'
                    hayPendientes={hayPendientes}
                />
            );
        default:
            return <PanelPreview color={color} />;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    background: '#fff',
                    borderBottom: '1px solid rgba(5,5,5,0.06)',
                }}
            >
                <Segmented options={SUPERFICIES} value={superficie} onChange={onSuperficie} />
                <span style={{ flexGrow: 1 }} />
                <Text type='secondary' style={{ fontSize: 13 }}>{NOTAS[superficie]}</Text>
            </div>
            <div style={{ flexGrow: 1, padding: 24, minHeight: 0, overflow: 'auto' }}>
                <div
                    style={{
                        background: '#fff',
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        minHeight: '100%',
                        padding: 24,
                    }}
                >
                    {renderSuperficie()}
                </div>
            </div>
        </div>
    );
}
