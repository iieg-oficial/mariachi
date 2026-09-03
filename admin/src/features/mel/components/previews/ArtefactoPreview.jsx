import { useEffect, useState } from 'react';
import { Empty, Spin, Tag, Typography } from 'antd';
import { getArtefacto } from '@features/mel/api/melService';

const { Text } = Typography;

export default function ArtefactoPreview({ codigo, artefacto, nota, hayPendientes }) {
    const [contenido, setContenido] = useState('');
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let vigente = true;
        setCargando(true);
        setError(null);
        getArtefacto(codigo, artefacto)
            .then((texto) => {
                if (vigente) setContenido(texto);
            })
            .catch(() => {
                if (vigente) setError(`No se pudo generar ${artefacto}`);
            })
            .finally(() => {
                if (vigente) setCargando(false);
            });
        return () => { vigente = false; };
    }, [codigo, artefacto]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Text code strong>{artefacto}</Text>
                {hayPendientes && <Tag color='warning'>refleja lo guardado, no lo pendiente</Tag>}
                <span style={{ flexGrow: 1 }} />
                <Text type='secondary' style={{ fontSize: 13 }}>{nota}</Text>
            </div>
            <Spin spinning={cargando}>
                <div
                    style={{
                        background: '#fafafa',
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        padding: 16,
                        minHeight: 240,
                        maxHeight: 460,
                        overflow: 'auto',
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
    );
}
