import { Button, Spin, Typography } from 'antd';
import useInfiniteScroll from '@shared/hooks/useInfiniteScroll';

const { Text } = Typography;

export default function InfiniteScrollSentinel({
    hasMore,
    loading,
    loadingMore,
    onLoadMore,
    loaded,
    total,
    root = null,
    label = 'elemento',
    labelPlural = 'elementos',
}) {
    const { setSentinel } = useInfiniteScroll({
        hasMore,
        loading: loading || loadingMore,
        onLoadMore,
        root,
    });

    if (loading) return null;

    const nombre = total === 1 ? label : labelPlural;

    return (
        <div
            ref={setSentinel}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '16px 0',
            }}
        >
            {loadingMore && <Spin size="small" />}
            {!loadingMore && hasMore && (
                <Button size="small" onClick={onLoadMore}>Cargar más</Button>
            )}
            {total > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {hasMore ? `${loaded} de ${total} ${nombre}` : `${total} ${nombre}`}
                </Text>
            )}
        </div>
    );
}
