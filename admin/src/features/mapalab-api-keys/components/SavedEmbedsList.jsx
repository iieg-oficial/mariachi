import {
    Button,
    Card,
    Empty,
    List,
    Popconfirm,
    Space,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import { CopyOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { buildSnippet } from './playgroundHelpers';

const { Text } = Typography;

export default function SavedEmbedsList({
    embeds,
    loading,
    labelByRef,
    apiKey,
    baseUrl,
    onCopy,
    onDelete,
    onLoadEmbed,
}) {
    const buildPersistedSnippet = (item) => buildSnippet({
        keyValue: `${apiKey.keyPrefix}…`,
        share: item.shareId,
        height: 500,
        baseUrl,
    });

    return (
        <Card title="Mapas guardados (no expiran)" size="small">
            <List
                loading={loading}
                dataSource={embeds}
                locale={{ emptyText: <Empty description="Todavía no hay mapas guardados. Arma uno arriba y dale 'Guardar este mapa'." /> }}
                renderItem={(item) => {
                    const persistedSnippet = buildPersistedSnippet(item);
                    const layerSlugs = item.summary?.layers || [];
                    const layerLabels = layerSlugs.map((s) => labelByRef[s] || s);
                    const view = item.summary?.view || null;
                    return (
                        <List.Item
                            key={item.id}
                            actions={[
                                <Tooltip key="load" title="Cargar este mapa para volver a verlo o editarlo">
                                    <Button
                                        size="small"
                                        icon={<EyeOutlined />}
                                        onClick={() => {
                                            onLoadEmbed(item);
                                            message.success(item.summary?.layers?.length
                                                ? `Mapa cargado: ${item.summary.layers.length} capas`
                                                : `Mapa con código ${item.shareId} cargado`);
                                            if (typeof window !== 'undefined') {
                                                setTimeout(() => {
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }, 50);
                                            }
                                        }}
                                    />
                                </Tooltip>,
                                <Tooltip key="copy" title="Copiar código para pegar en una página">
                                    <Button
                                        size="small"
                                        icon={<CopyOutlined />}
                                        onClick={() => onCopy(persistedSnippet, 'Código copiado')}
                                    />
                                </Tooltip>,
                                <Popconfirm
                                    key="del"
                                    title="¿Borrar este mapa guardado?"
                                    description="Se quita la protección de permanencia. Si nadie lo está usando, el mapa va a desaparecer después de 90 días sin uso."
                                    okText="Sí, borrar"
                                    cancelText="Cancelar"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => onDelete(item.shareId)}
                                >
                                    <Tooltip title="Borrar este mapa guardado">
                                        <Button size="small" danger icon={<DeleteOutlined />} />
                                    </Tooltip>
                                </Popconfirm>,
                            ]}
                        >
                            <List.Item.Meta
                                title={
                                    <Space size="small" wrap>
                                        <Text strong>{item.label || `Mapa del ${new Date(item.creadoEn).toLocaleDateString('es-MX')}`}</Text>
                                        {item.permanent && <Tag color="green">Permanente</Tag>}
                                        {!item.shareExists && <Tag color="red">Ya no disponible</Tag>}
                                    </Space>
                                }
                                description={
                                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                        {layerLabels.length > 0 && (
                                            <Space size={4} wrap>
                                                {layerLabels.slice(0, 5).map((l, i) => (
                                                    <Tag key={`${l}-${i}`} color="blue">{l}</Tag>
                                                ))}
                                                {layerLabels.length > 5 && (
                                                    <Tooltip title={layerLabels.slice(5).join(', ')}>
                                                        <Tag>+{layerLabels.length - 5}</Tag>
                                                    </Tooltip>
                                                )}
                                            </Space>
                                        )}
                                        {view && (typeof view.lat === 'number' || typeof view.zoom === 'number') && (
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                {typeof view.lat === 'number' && typeof view.lon === 'number' && (
                                                    <>Centro: {view.lat.toFixed(3)}, {view.lon.toFixed(3)} · </>
                                                )}
                                                {typeof view.zoom === 'number' && <>Acercamiento: {view.zoom}</>}
                                            </Text>
                                        )}
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            Guardado: {new Date(item.creadoEn).toLocaleString('es-MX')} · Código <Text code style={{ fontSize: 10 }}>{item.shareId}</Text>
                                        </Text>
                                    </Space>
                                }
                            />
                        </List.Item>
                    );
                }}
            />
        </Card>
    );
}
