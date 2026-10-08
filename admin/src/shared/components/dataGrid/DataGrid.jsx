import { useCallback, useMemo } from 'react';
import { Avatar, Tooltip, Typography } from 'antd';
import { DataSheetGrid } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import { buildGridColumns } from '@shared/components/dataGrid/cellTypes';

const { Text } = Typography;

const GRID_STYLES = `
    .grid-cell-dirty { background-color: #fff7e6; }
    .grid-cell-conflict { background-color: #fff1f0; box-shadow: inset 0 0 0 1px #ff4d4f; }
    .grid-cell-locked {
        background-color: #f6f0fa;
        background-image: repeating-linear-gradient(
            45deg, rgba(92, 36, 114, 0.14) 0 3px, transparent 3px 6px
        );
    }
    .mariachi-grid .dsg-cell-header { font-size: 12px; }
    .mariachi-grid .dsg-cell-gutter { padding: 0 6px; }
`;

const initialsOf = (name) => (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const RowGutter = ({ rowData, rowIndex, columnData }) => {
    const { rowKeyField, stickyMeta, presenceByRow, dirtyRows } = columnData;
    const rowKey = rowData?.[rowKeyField];
    const editors = presenceByRow?.[rowKey] || [];
    const label = stickyMeta ? rowData?.[stickyMeta.key] : rowKey;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', overflow: 'hidden' }}>
            <Text type="secondary" style={{ fontSize: 10, minWidth: 22, textAlign: 'right' }}>
                {rowIndex + 1}
            </Text>
            {editors.length > 0 && (
                <Tooltip title={`Editando ahora: ${editors.map((e) => e.name || e.username).join(', ')}`}>
                    <Avatar size={18} style={{ backgroundColor: '#5C2472', fontSize: 9, flexShrink: 0 }}>
                        {initialsOf(editors[0].name || editors[0].username)}
                    </Avatar>
                </Tooltip>
            )}
            <Tooltip title={label}>
                <Text
                    style={{
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: dirtyRows?.has(rowKey) ? 600 : 400,
                    }}
                >
                    {label}
                </Text>
            </Tooltip>
        </div>
    );
};

export default function DataGrid({
    columnsMeta,
    catalogs,
    data,
    draft,
    rowKeyField,
    conflicts = [],
    onChange,
    onActiveRowChange,
    onActiveCellChange,
    presenceByRow,
    isCellDisabled,
    height = 560,
}) {
    const conflictKeys = useMemo(
        () => new Set(conflicts.map((item) => `${item.rowKey}::${item.column}`)),
        [conflicts],
    );

    const dirtyRows = useMemo(() => new Set(Object.keys(draft || {})), [draft]);

    const stickyMeta = useMemo(
        () => columnsMeta.find((meta) => meta.sticky) || null,
        [columnsMeta],
    );

    const columns = useMemo(() => buildGridColumns({
        columnsMeta,
        catalogs,
        draft,
        rowKeyField,
        conflictKeys,
        isCellDisabled,
    }), [columnsMeta, catalogs, draft, rowKeyField, conflictKeys, isCellDisabled]);

    const gutterColumn = useMemo(() => ({
        component: RowGutter,
        columnData: { rowKeyField, stickyMeta, presenceByRow, dirtyRows },
        basis: stickyMeta ? 260 : 60,
        minWidth: stickyMeta ? 260 : 60,
        grow: 0,
        shrink: 0,
    }), [rowKeyField, stickyMeta, presenceByRow, dirtyRows]);

    const handleActiveCellChange = useCallback(({ cell }) => {
        const rowKey = cell && cell.row !== undefined && cell.row !== null
            ? (data[cell.row]?.[rowKeyField] ?? null)
            : null;
        onActiveRowChange?.(rowKey);
        onActiveCellChange?.({ rowKey, columnId: cell?.colId ?? null });
    }, [onActiveRowChange, onActiveCellChange, data, rowKeyField]);

    return (
        <>
            <style>{GRID_STYLES}</style>
            <DataSheetGrid
                className="mariachi-grid"
                value={data}
                columns={columns}
                gutterColumn={gutterColumn}
                onChange={onChange}
                rowKey={({ rowData }) => rowData[rowKeyField]}
                height={height}
                lockRows
                addRowsComponent={false}
                onActiveCellChange={handleActiveCellChange}
            />
        </>
    );
}
