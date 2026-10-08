import { useMemo } from 'react';
import { Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined, DownOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import { nodeIcon } from '@features/mapalab-layers/constants/nodeVisuals';
import { findPath, siblingsOf } from '@features/mapalab-layers/utils/treeSearch';

const { Text } = Typography;

export default function LayerBreadcrumb({ treeData, selectedKey, onSelect, onBackToTree, isMobile }) {
    const path = useMemo(
        () => findPath(treeData, selectedKey) || [],
        [treeData, selectedKey],
    );

    return (
        <Space size={2} wrap={false} style={{ width: '100%', padding: '8px 12px', overflowX: 'auto' }}>
            <Button size="small" type="text" icon={<ArrowLeftOutlined />} onClick={onBackToTree}>
                {isMobile ? null : 'Todo el árbol'}
            </Button>

            {path.map((node, i) => {
                const siblings = siblingsOf(treeData, path.slice(0, i + 1));
                const isLast = i === path.length - 1;
                const items = siblings
                    .filter((s) => s.key !== node.key)
                    .map((s) => ({ key: s.key, label: s.title }));
                return (
                    <Space key={node.key} size={0} wrap={false}>
                        <Text type="secondary" style={{ margin: '0 2px' }}>/</Text>
                        {items.length > 0 ? (
                            <Dropdown
                                trigger={['click']}
                                menu={{ items, onClick: ({ key }) => onSelect(key) }}
                            >
                                <Button
                                    size="small"
                                    type="text"
                                    icon={nodeIcon(node)}
                                    onClick={() => onSelect(node.key)}
                                    style={{ fontWeight: isLast ? 600 : 400, paddingInline: 6 }}
                                >
                                    {node.title}
                                    <DownOutlined style={{ fontSize: 9, marginInlineStart: 4, opacity: 0.45 }} />
                                </Button>
                            </Dropdown>
                        ) : (
                            <Button
                                size="small"
                                type="text"
                                icon={nodeIcon(node)}
                                onClick={() => onSelect(node.key)}
                                style={{ fontWeight: isLast ? 600 : 400, paddingInline: 6 }}
                            >
                                {node.title}
                            </Button>
                        )}
                    </Space>
                );
            })}
        </Space>
    );
}
