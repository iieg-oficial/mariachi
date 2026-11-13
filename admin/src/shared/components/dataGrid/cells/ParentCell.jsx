import { useEffect, useRef } from 'react';
import { TreeSelect } from 'antd';
import CellText from '@shared/components/dataGrid/cells/CellText';

export default function ParentCell({ rowData, setRowData, focus, stopEditing, columnData }) {
    const ref = useRef(null);

    useEffect(() => {
        if (focus) {
            ref.current?.focus();
        } else {
            ref.current?.blur();
        }
    }, [focus]);

    if (!focus) return <CellText>{rowData ? columnData.pathOf(rowData) : null}</CellText>;

    return (
        <TreeSelect
            ref={ref}
            variant="borderless"
            style={{ width: '100%' }}
            open={focus}
            value={rowData ?? undefined}
            treeData={columnData.treeData}
            treeNodeLabelProp="ruta"
            treeDefaultExpandedKeys={rowData ? [rowData] : []}
            showSearch={{ treeNodeFilterProp: 'title' }}
            allowClear
            placeholder="—"
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
