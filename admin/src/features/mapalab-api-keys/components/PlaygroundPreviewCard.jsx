import { forwardRef } from 'react';
import { Button, Card, Space, Typography } from 'antd';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

const PlaygroundPreviewCard = forwardRef(function PlaygroundPreviewCard({
    manualKey,
    activeShare,
    activeLayers,
    embedUrl,
    snippet,
    height,
    mode,
    rotating,
    apiKey,
    onRotateAndPreview,
    onCopy,
}, ref) {
    const hasContent = manualKey && (activeShare || activeLayers);
    return (
        <>
            <Card
                size="small"
                title="Así se va a ver el mapa"
                extra={
                    <Button size="small" icon={<CopyOutlined />} onClick={() => onCopy(snippet, 'Código copiado')}>
                        Copiar código para pegar
                    </Button>
                }
                bodyStyle={{ padding: 0 }}
            >
                {hasContent ? (
                    <iframe
                        ref={ref}
                        title="Previsualización del mapa"
                        src={embedUrl}
                        style={{ width: '100%', height: `${height}px`, border: 0, display: 'block' }}
                    />
                ) : (
                    <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                        {!manualKey ? (
                            <Space orientation="vertical" size="middle" align="center">
                                <Text type="secondary">No tenemos guardada la contraseña completa de esta llave (por seguridad solo guardamos un resumen).</Text>
                                <Button
                                    type="primary"
                                    icon={<ReloadOutlined />}
                                    loading={rotating}
                                    onClick={onRotateAndPreview}
                                    disabled={!apiKey?.id}
                                >
                                    Generar una contraseña nueva para probar
                                </Button>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    Si ya tienes la contraseña a la mano, pégala arriba. Generar una nueva reemplaza la anterior: los sitios que ya la usen van a dejar de funcionar hasta actualizarla.
                                </Text>
                            </Space>
                        ) : mode === 'layers'
                            ? 'Selecciona al menos una capa para que aparezca el mapa.'
                            : 'Pega el código del mapa guardado para previsualizarlo.'}
                    </div>
                )}
            </Card>
            <Card title="Código listo para pegar en tu página" size="small" style={{ marginTop: 12 }}>
                <Paragraph type="secondary" style={{ fontSize: 11, marginBottom: 8 }}>
                    Copia este código y pégalo en el HTML de la página donde quieres mostrar el mapa.
                </Paragraph>
                <Paragraph
                    copyable={{ text: snippet, tooltips: 'Copiar código' }}
                    style={{
                        background: '#fafafa',
                        padding: 12,
                        borderRadius: 6,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        whiteSpace: 'pre',
                        marginBottom: 0,
                    }}
                >
                    {snippet}
                </Paragraph>
            </Card>
        </>
    );
});

export default PlaygroundPreviewCard;
