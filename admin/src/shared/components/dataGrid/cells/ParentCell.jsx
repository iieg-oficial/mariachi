import { useEffect, useRef } from 'react';
import { TreeSelect } from 'antd';

export default function ParentCell({ rowData, setRowData, focus, stopEditing, columnData }) {
    const ref = useRef(null);

    useEffect(() => {
        if (focus) ref.current?.focus();
    }, [focus]);

    if (!focus) {
        return (
            <span style={{ padding: '0 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {rowData ? columnData.pathOf(rowData) : '—'}
            </span>
        );
    }

    return (
        <TreeSelect
            ref={ref}
            variant="borderless"
            style={{ width: '100%' }}
            open
            value={rowData ?? undefined}
            treeData={columnData.treeData}
            treeDefaultExpandedKeys={rowData ? [rowData] : []}
            showSearch={{ treeNodeFilterProp: 'title' }}
            allowClear
            popupMatchSelectWidth={360}
            onChange={(value) => {
                setRowData(value ?? null);
                setTimeout(() => stopEditing({ nextRow: false }), 0);
            }}
            onOpenChange={(open) => {
                if (!open) stopEditing({ nextRow: false });
            }}
        />
    );
}
