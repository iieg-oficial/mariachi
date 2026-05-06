import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';

export default function SortableItem({ id, children, dragHandle = true }) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {dragHandle ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span
                        {...listeners}
                        style={{ cursor: 'grab', padding: '4px 0', color: '#999' }}
                        aria-label="Arrastrar"
                    >
                        <HolderOutlined />
                    </span>
                    <div style={{ flex: 1 }}>{children}</div>
                </div>
            ) : (
                <div {...listeners}>{children}</div>
            )}
        </div>
    );
}
