import { Collapse, Empty, Space, Tag, Timeline, Typography } from 'antd';

const { Text } = Typography;

const LEVEL_COLOR = {
    debug: '#999',
    info: '#1677ff',
    warning: '#faad14',
    error: '#ff4d4f',
    critical: '#a8071a',
};


export default function SourceContextView({ context }) {
    const ctx = context || {};
    const auto = ctx.auto;
    const user = ctx.user;
    const breadcrumbs = ctx.breadcrumbs;
    const custom = ctx.custom;
    const hasStructured = Boolean(auto || user || breadcrumbs || custom);

    if (!hasStructured) {
        if (!ctx || Object.keys(ctx).length === 0) {
            return <Empty description="Sin contexto" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
        }
        return (
            <pre
                style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 11,
                    maxHeight: 240,
                    overflow: 'auto',
                    margin: 0,
                }}
            >
                {JSON.stringify(ctx, null, 2)}
            </pre>
        );
    }

    return (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {user && (
                <div>
                    <Text strong style={{ fontSize: 12 }}>Usuario</Text>
                    <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
                        <Space wrap size={[8, 4]}>
                            {user.id != null && <Tag color="blue">id: {user.id}</Tag>}
                            {user.email && <Text copyable style={{ fontSize: 12 }}>{user.email}</Text>}
                            {user.name && <Text style={{ fontSize: 12 }}>{user.name}</Text>}
                            {user.role && <Tag>{user.role}</Tag>}
                        </Space>
                        {user.metadata && Object.keys(user.metadata).length > 0 && (
                            <pre style={{ marginTop: 6, fontSize: 11, marginBottom: 0 }}>
                                {JSON.stringify(user.metadata, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            )}

            {auto && (
                <div>
                    <Text strong style={{ fontSize: 12 }}>Tecnología</Text>
                    <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4, fontSize: 12 }}>
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                            {auto.url && <div><Text type="secondary" style={{ fontSize: 11 }}>URL:</Text> <Text code>{auto.url}</Text></div>}
                            {auto.referrer && <div><Text type="secondary" style={{ fontSize: 11 }}>Referrer:</Text> <Text code style={{ fontSize: 11 }}>{auto.referrer}</Text></div>}
                            {auto.userAgent && (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 11 }}>User Agent:</Text>{' '}
                                    <Text style={{ fontSize: 11 }}>{auto.userAgent}</Text>
                                </div>
                            )}
                            {auto.viewport && (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 11 }}>Viewport:</Text>{' '}
                                    <Tag>{auto.viewport.width}×{auto.viewport.height}</Tag>
                                    {auto.viewport.dpr && <Tag>DPR {auto.viewport.dpr}</Tag>}
                                </div>
                            )}
                            <Space wrap size={4}>
                                {auto.lang && <Tag>{auto.lang}</Tag>}
                                {auto.timezone && <Tag>{auto.timezone}</Tag>}
                                {auto.version && <Tag color="blue">v{auto.version}</Tag>}
                                {auto.timestamp && <Text type="secondary" style={{ fontSize: 10 }}>{auto.timestamp}</Text>}
                            </Space>
                        </Space>
                    </div>
                </div>
            )}

            {breadcrumbs && breadcrumbs.length > 0 && (
                <Collapse
                    size="small"
                    items={[
                        {
                            key: 'breadcrumbs',
                            label: <Text strong style={{ fontSize: 12 }}>Actividad reciente ({breadcrumbs.length})</Text>,
                            children: (
                                <Timeline
                                    items={breadcrumbs.slice(-50).map((b, idx) => ({
                                        key: idx,
                                        color: LEVEL_COLOR[b.level] || '#999',
                                        children: (
                                            <div style={{ fontSize: 12 }}>
                                                <Space size={4}>
                                                    {b.category && <Tag style={{ fontSize: 10 }}>{b.category}</Tag>}
                                                    {b.timestamp && <Text type="secondary" style={{ fontSize: 10 }}>{b.timestamp}</Text>}
                                                </Space>
                                                <div style={{ marginTop: 2, wordBreak: 'break-all' }}>
                                                    {b.message}
                                                </div>
                                                {b.data && Object.keys(b.data).length > 0 && (
                                                    <pre style={{ fontSize: 10, marginTop: 2, marginBottom: 0, color: '#666' }}>
                                                        {JSON.stringify(b.data, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        ),
                                    }))}
                                />
                            ),
                        },
                    ]}
                />
            )}

            {custom && Object.keys(custom).length > 0 && (
                <Collapse
                    size="small"
                    items={[
                        {
                            key: 'custom',
                            label: <Text strong style={{ fontSize: 12 }}>Contexto custom del huésped</Text>,
                            children: (
                                <pre style={{ fontSize: 11, marginBottom: 0 }}>
                                    {JSON.stringify(custom, null, 2)}
                                </pre>
                            ),
                        },
                    ]}
                />
            )}
        </Space>
    );
}
