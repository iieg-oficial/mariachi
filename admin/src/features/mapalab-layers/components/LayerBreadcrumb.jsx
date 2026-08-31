import { useMemo, useState } from 'react';
import { AutoComplete, Button, Dropdown, Space, Tooltip, Typography } from 'antd';
import { ArrowLeftOutlined, DownOutlined, LeftOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { nodeIcon } from '@features/mapalab-layers/constants/nodeVisuals';
import { findPath, flattenSelectable, matchesQuery, siblingsOf } from '@features/mapalab-layers/utils/treeSearch';

const { Text } = Typography;

const MAX_RESULTS = 12;

export default function LayerBreadcrumb({ treeData, selectedKey, onSelect, onBackToTree, isMobile }) {
    const [q, setQ] = useState('');

    const path = useMemo(
        () => findPath(treeData, selectedKey) || [],
        [treeData, selectedKey],
    );

    const currentSiblings = useMemo(
        () => siblingsOf(treeData, path),
        [treeData, path],
    );

    const currentIndex = currentSiblings.findIndex((n) => n.key === selectedKey);

    const options = useMemo(() => {
        if (!q.trim()) return [];
        return flattenSelectable(treeData)
            .filter(({ node }) => matchesQuery(node, q.trim()))
            .slice(0, MAX_RESULTS)
            .map(({ node, path: nodePath }) => ({
                value: node.key,
                label: (
                    <Space size={6} style={{ width: '100%' }}>
                        <Text>{node.title}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {nodePath.slice(0, -1).map((p) => p.title).join(' › ')}
                        </Text>
                    </Space>
                ),
            }));
    }, [q, treeData]);

    const step = (delta) => {
        const next = currentSiblings[currentIndex + delta];
        if (next) onSelect(next.key);
    };

    return (
        <Space size={4} wrap={false} style={{ width: '100%', padding: '8px 12px', overflowX: 'auto' }}>
            <Button size="small" type="text" icon={<ArrowLeftOutlined />} onClick={onBackToTree}>
                {isMobile ? null : 'Todo el árbol'}
            </Button>

            {path.map((node, i) => {
                const siblings = siblingsOf(treeData, path.slice(0, i + 1));
                const isLast = i === path.length - 1;
                return (
                    <Space key={node.key} size={0} wrap={false}>
                        <Text type="secondary" style={{ margin: '0 2px' }}>/</Text>
                        <Button
                            size="small"
                            type="text"
                            icon={nodeIcon(node)}
                            onClick={() => onSelect(node.key)}
                            style={{ fontWeight: isLast ? 600 : 400, paddingInline: 6 }}
                        >
                            {node.title}
                        </Button>
                        {siblings.length > 1 && (
                            <Dropdown
                                trigger={['click']}
                                menu={{
                                    selectedKeys: [node.key],
                                    items: siblings.map((s) => ({ key: s.key, label: s.title })),
                                    onClick: ({ key }) => onSelect(key),
                                }}
                            >
                                <Button
                                    size="small"
                                    type="text"
                                    icon={<DownOutlined style={{ fontSize: 9 }} />}
                                    aria-label={`Otros al nivel de ${node.title}`}
                                    style={{ paddingInline: 2 }}
                                />
                            </Dropdown>
                        )}
                    </Space>
                );
            })}

            <span style={{ flex: 1 }} />

            <Space.Compact size="small">
                <Tooltip title="Anterior a este nivel">
                    <Button
                        size="small"
                        icon={<LeftOutlined />}
                        disabled={currentIndex <= 0}
                        onClick={() => step(-1)}
                        aria-label="Anterior a este nivel"
                    />
                </Tooltip>
                <Tooltip title="Siguiente a este nivel">
                    <Button
                        size="small"
                        icon={<RightOutlined />}
                        disabled={currentIndex < 0 || currentIndex >= currentSiblings.length - 1}
                        onClick={() => step(1)}
                        aria-label="Siguiente a este nivel"
                    />
                </Tooltip>
            </Space.Compact>

            <AutoComplete
                size="small"
                value={q}
                options={options}
                onSearch={setQ}
                onChange={setQ}
                onSelect={(key) => { setQ(''); onSelect(key); }}
                style={{ width: isMobile ? 150 : 220 }}
                placeholder="Ir a otra capa"
                notFoundContent={q.trim() ? 'Ninguna capa coincide' : null}
                prefix={<SearchOutlined />}
                allowClear
            />
        </Space>
    );
}
