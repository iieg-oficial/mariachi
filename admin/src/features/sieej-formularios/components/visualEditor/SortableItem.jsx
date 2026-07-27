import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';

export default function SortableItem({
    id, children, dragHandle = true, wrapperStyle, wrapperProps, gripFooter,
}) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        ...wrapperStyle,
    };

    return (
        <div ref={setNodeRef} style={style} {...wrapperProps} {...attributes}>
            {dragHandle ? (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 4 }}>
                        <span
                            {...listeners}
                            style={{ cursor: 'grab', padding: '4px 0', color: '#999' }}
                            aria-label="Arrastrar"
                        >
                            <HolderOutlined />
                        </span>
                        {gripFooter}
                    </div>
                    <div style={{ flex: 1 }}>{children}</div>
                </div>
            ) : (
                <div {...listeners}>{children}</div>
            )}
        </div>
    );
}
