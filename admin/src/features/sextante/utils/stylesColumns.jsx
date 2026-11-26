import { Tag, Typography } from 'antd';
import { LayerTags, ShapeTag } from '@features/sextante/components/StyleTags';

const { Text } = Typography;

const NOWRAP = { whiteSpace: 'nowrap' };
const pending = <Text type="secondary">…</Text>;
const none = <Text type="secondary">—</Text>;

export const buildColumns = (summaries) => {
    const summaryOf = (row) => (row.isGlobal ? null : summaries[row.alias]?.[row.name]);
    const waiting = (row) => !row.isGlobal && !summaries[row.alias];
    return [
        {
            title: 'Estilo',
            dataIndex: 'name',
            key: 'name',
            render: (name) => <Text strong style={NOWRAP}>{name}</Text>,
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Workspace',
            dataIndex: 'alias',
            key: 'alias',
            width: 160,
            render: (alias, row) => (row.isGlobal ? none : alias),
            sorter: (a, b) => a.alias.localeCompare(b.alias),
        },
        {
            title: 'Ámbito',
            dataIndex: 'isGlobal',
            key: 'isGlobal',
            width: 130,
            render: (isGlobal) => (isGlobal ? <Tag color="gold">Global</Tag> : <Tag>Del workspace</Tag>),
        },
        {
            title: 'Tipo',
            key: 'shape',
            width: 190,
            render: (_, row) => {
                if (waiting(row)) return pending;
                const summary = summaryOf(row);
                return summary ? <ShapeTag summary={summary} /> : none;
            },
        },
        {
            title: 'Capas que lo usan',
            key: 'sharedBy',
            width: 240,
            render: (_, row) => (waiting(row) ? pending : <LayerTags layers={summaryOf(row)?.sharedBy || []} />),
        },
    ];
};
