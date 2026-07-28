import { Badge, Button, Space, Tooltip, Typography } from 'antd';

const { Text } = Typography;

const SMALL = { fontSize: 11 };

export default function MetadataGridStatusBar({
    dirtyCount,
    onDiscard,
    activeRow,
    activeColumnTitle,
    othersEditing = [],
    pendingDescriptions = 0,
    visibleCount,
    totalCount,
}) {
    return (
        <div
            style={{
                flexShrink: 0,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '0 10px',
                borderTop: '1px solid rgba(5, 5, 5, 0.06)',
            }}
        >
            <Space size={10} style={{ minWidth: 0, overflow: 'hidden' }}>
                {dirtyCount > 0 ? (
                    <>
                        <Badge status="warning" text={<Text style={SMALL}>{dirtyCount} sin guardar</Text>} />
                        <Button size="small" type="link" danger style={{ ...SMALL, padding: 0 }} onClick={onDiscard}>
                            Descartar
                        </Button>
                    </>
                ) : (
                    <Badge status="default" text={<Text type="secondary" style={SMALL}>Todo guardado</Text>} />
                )}
                {activeRow && (
                    <Text
                        type="secondary"
                        style={{ ...SMALL, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                        {activeRow.layer_key}
                        {activeColumnTitle ? ` · ${activeColumnTitle}` : ''}
                        {activeRow.updated_by ? ` · última edición: ${activeRow.updated_by}` : ''}
                    </Text>
                )}
            </Space>

            <Space size={10} style={{ flexShrink: 0 }}>
                {othersEditing.length > 0 && (
                    <Tooltip title={`Editando ahora: ${othersEditing.join(', ')}`}>
                        <Text type="secondary" style={SMALL}>
                            {othersEditing.length} {othersEditing.length === 1 ? 'persona más' : 'personas más'}
                        </Text>
                    </Tooltip>
                )}
                {pendingDescriptions > 0 && (
                    <Tooltip title="Capas sin descripción capturada">
                        <Text type="secondary" style={SMALL}>{pendingDescriptions} sin descripción</Text>
                    </Tooltip>
                )}
                <Text type="secondary" style={SMALL}>
                    {visibleCount === totalCount
                        ? `${totalCount} capas`
                        : `${visibleCount} de ${totalCount} capas`}
                </Text>
            </Space>
        </div>
    );
}
