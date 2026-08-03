import { Badge, Button, Space, Tooltip, Typography } from 'antd';

const { Text } = Typography;

const SMALL = { fontSize: 11 };

export default function GridStatusBar({
    dirtyCount,
    onDiscard,
    activeRow,
    activeRowLabel,
    activeColumnTitle,
    othersEditing = [],
    visibleCount,
    totalCount,
    itemsLabel = 'filas',
    extra = null,
}) {
    return (
        <div
            style={{
                flex: 1,
                minWidth: 0,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '0 6px 0 16px',
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
                        {activeRowLabel}
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
                {extra}
                <Text type="secondary" style={SMALL}>
                    {visibleCount === totalCount
                        ? `${totalCount} ${itemsLabel}`
                        : `${visibleCount} de ${totalCount} ${itemsLabel}`}
                </Text>
            </Space>
        </div>
    );
}
