import { useEffect, useRef } from 'react';
import { Select } from 'antd';
import CellText from '@shared/components/dataGrid/cells/CellText';

export default function SelectCell({ rowData, setRowData, focus, stopEditing, columnData }) {
    const ref = useRef(null);

    useEffect(() => {
        if (focus) {
            ref.current?.focus();
        } else {
            ref.current?.blur();
        }
    }, [focus]);

    if (!focus) {
        const option = columnData.options?.find((item) => item.value === rowData);
        return <CellText>{option ? option.label : rowData}</CellText>;
    }

    return (
        <Select
            ref={ref}
            variant="borderless"
            style={{ width: '100%' }}
            open={focus}
            value={rowData ?? undefined}
            options={columnData.options}
            allowClear
            showSearch
            placeholder=""
            onChange={(value) => {
                setRowData(value ?? null);
                setTimeout(() => stopEditing({ nextRow: false }), 0);
            }}
            onOpenChange={(open) => {
                if (!open) stopEditing({ nextRow: false });
            }}
            filterOption={(input, option) =>
                String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
            }
        />
    );
}
