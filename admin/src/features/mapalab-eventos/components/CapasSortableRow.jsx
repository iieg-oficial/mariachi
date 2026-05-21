import { createContext, useContext, useMemo } from 'react';
import { Button } from 'antd';
import { HolderOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const RowContext = createContext({});

export function CapasSortableRow(props) {
    const { 'data-row-key': rowKey } = props;
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: rowKey });

    const style = {
        ...props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging ? { position: 'relative', zIndex: 999, background: '#fff' } : {}),
    };

    const ctx = useMemo(
        () => ({ listeners, attributes, setActivatorNodeRef }),
        [listeners, attributes, setActivatorNodeRef],
    );

    return (
        <RowContext.Provider value={ctx}>
            <tr {...props} ref={setNodeRef} style={style} />
        </RowContext.Provider>
    );
}

export function DragHandleCell({ disabled }) {
    const { listeners, setActivatorNodeRef } = useContext(RowContext);
    return (
        <Button
            type="text"
            size="small"
            ref={setActivatorNodeRef}
            icon={<HolderOutlined />}
            aria-label="Arrastrar para reordenar"
            disabled={disabled}
            style={{ cursor: disabled ? 'not-allowed' : 'grab', touchAction: 'none' }}
            {...(disabled ? {} : listeners)}
        />
    );
}
