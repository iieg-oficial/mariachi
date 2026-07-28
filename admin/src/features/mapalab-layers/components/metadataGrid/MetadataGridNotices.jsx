import { Alert, Button, Space, Typography } from 'antd';

const { Text } = Typography;

export default function MetadataGridNotices({
    recoveredDraft,
    onRestoreDraft,
    onDismissDraft,
    conflicts = [],
    dynamicStatsCount = 0,
}) {
    if (!recoveredDraft && conflicts.length === 0 && dynamicStatsCount === 0) return null;

    return (
        <div style={{ flexShrink: 0, padding: '8px 8px 0' }}>
            {recoveredDraft && (
                <Alert
                    style={{ marginBottom: 8 }}
                    type="info"
                    showIcon
                    message="Tienes cambios sin guardar de una sesión anterior"
                    description={`Guardados el ${new Date(recoveredDraft.savedAt).toLocaleString()}.`}
                    action={(
                        <Space>
                            <Button size="small" type="primary" onClick={onRestoreDraft}>
                                Retomar
                            </Button>
                            <Button size="small" onClick={onDismissDraft}>
                                Descartar
                            </Button>
                        </Space>
                    )}
                />
            )}

            {conflicts.length > 0 && (
                <Alert
                    style={{ marginBottom: 8 }}
                    type="warning"
                    showIcon
                    closable
                    message={`${conflicts.length} celda(s) cambiaron mientras las editabas`}
                    description={(
                        <div>
                            <div style={{ marginBottom: 6 }}>
                                Tus valores siguen marcados en rojo. Revisa el valor actual y vuelve a
                                guardar si tu versión es la correcta.
                            </div>
                            {conflicts.slice(0, 5).map((item) => (
                                <div key={`${item.rowKey}-${item.column}`} style={{ fontSize: 12 }}>
                                    <code>{item.rowKey}</code> · {item.column} — ahora dice{' '}
                                    <Text strong>{String(item.actual ?? '(vacío)')}</Text>
                                </div>
                            ))}
                        </div>
                    )}
                />
            )}

            {dynamicStatsCount > 0 && (
                <Alert
                    style={{ marginBottom: 8 }}
                    type="info"
                    showIcon
                    closable
                    message={`${dynamicStatsCount} capa(s) calculan su numeralia desde la base de datos`}
                    description="Sus celdas de numeralia están bloqueadas aquí: se editan en la pestaña Metadatos de la capa."
                />
            )}
        </div>
    );
}
