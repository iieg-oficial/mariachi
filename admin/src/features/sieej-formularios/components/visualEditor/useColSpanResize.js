import { useRef, useState } from 'react';
import { snapColSpan } from './fieldLayout';

export default function useColSpanResize({ colSpan, onResizeChange, onCommit }) {
    const handleRef = useRef(null);
    const [draggedColSpan, setDraggedColSpan] = useState(null);

    const startResize = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const wrapper = handleRef.current?.closest('[data-field-wrapper]');
        const grid = wrapper?.parentElement;
        if (!grid) return;

        const gridWidth = grid.getBoundingClientRect().width;
        const left = wrapper.getBoundingClientRect().left;
        let next = colSpan;

        const move = (e) => {
            next = snapColSpan((e.clientX - left) / gridWidth);
            setDraggedColSpan(next);
            onResizeChange?.(next);
        };
        const finish = () => {
            window.removeEventListener('pointermove', move);
            setDraggedColSpan(null);
            onResizeChange?.(null);
            if (next !== colSpan) onCommit?.(next);
        };

        onResizeChange?.(colSpan);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', finish, { once: true });
    };

    return { handleRef, draggedColSpan, startResize };
}
