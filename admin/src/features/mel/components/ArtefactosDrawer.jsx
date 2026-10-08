import { useEffect, useState } from 'react';
import { Drawer, Empty, Segmented, Spin, Tag, Typography } from 'antd';
import { getArtefacto } from '@features/mel/api/melService';

const { Text } = Typography;

const ARTEFACTOS = ['design.md', 'theme.css', 'tokens.css', 'fonts.css', 'tokens.qss'];

const NOTAS = {
    'design.md': 'la guía completa, primera hoja del ZIP',
    'theme.css': 'bloque @theme de Tailwind v4',
    'tokens.css': 'las mismas variables en :root',
    'fonts.css': '@font-face de las familias declaradas',
    'tokens.qss': 'lo que baja make tokens al complemento de QGIS',
};

export default function ArtefactosDrawer({ abierto, onCerrar, codigo, hayPendientes }) {
    const [artefacto, setArtefacto] = useState('design.md');
    const [contenido, setContenido] = useState('');
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!abierto || !codigo) return undefined;
        let vigente = true;
        setCargando(true);
        setError(null);
        getArtefacto(codigo, artefacto)
            .then((texto) => { if (vigente) setContenido(texto); })
            .catch(() => { if (vigente) setError(`No se pudo generar ${artefacto}`); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [abierto, codigo, artefacto]);

    return (
        <Drawer
            title='Artefactos generados'
            open={abierto}
            onClose={onCerrar}
            width={720}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
                <Segmented
                    options={ARTEFACTOS}
                    value={artefacto}
                    onChange={setArtefacto}
                    block
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Text type='secondary' style={{ fontSize: 13 }}>{NOTAS[artefacto]}</Text>
                    <span style={{ flexGrow: 1 }} />
                    {hayPendientes && <Tag color='warning'>refleja lo guardado, no lo pendiente</Tag>}
                </div>
                <Spin spinning={cargando}>
                    <div
                        style={{
                            background: '#fafafa',
                            border: '1px solid #f0f0f0',
                            borderRadius: 8,
                            padding: 16,
                            minHeight: 320,
                        }}
                    >
                        {error && <Empty description={error} />}
                        {!error && (
                            <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                {contenido}
                            </pre>
                        )}
                    </div>
                </Spin>
            </div>
        </Drawer>
    );
}
