import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tag, Space, Button } from 'antd';
import { EditOutlined, FileTextOutlined, HolderOutlined, EyeOutlined, EyeInvisibleOutlined, StopOutlined } from '@ant-design/icons';
import { getIconComponent } from '@utils/menuUtils';

const STYLES = {
    dragHandle: {
        color: '#999',
        cursor: 'grab',
        fontSize: 16,
        touchAction: 'none'
    },
    label: {
        fontWeight: 500,
        fontSize: 15,
        color: '#262626',
        marginBottom: 4
    },
    url: {
        fontSize: 13,
        color: '#8c8c8c',
        fontFamily: 'monospace',
        wordBreak: 'break-all'
    },
    tag: { margin: 0, fontSize: 13, padding: '2px 8px' },
    badgeTag: { marginLeft: 8, fontSize: 11 },
    button: { fontSize: 14 }
};

export default function SortableTreeItem({
    item,
    level,
    customIcons,
    isNew,
    isModified,
    onEdit,
    onEditPage,
    childCount = 0
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: item.id,
        data: { item, level }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        marginLeft: (level - 1) * 32
    };

    const renderIcon = () => {
        if (item.iconId) {
            const customIcon = customIcons.find(icon => icon.id === item.iconId);
            return customIcon ? (
                <span dangerouslySetInnerHTML={{ __html: customIcon.svg }} style={{ fontSize: 16, display: 'flex', color: '#1890ff' }} />
            ) : null;
        } else if (item.icon) {
            const IconComponent = getIconComponent(item.icon);
            return IconComponent ? <span style={{ fontSize: 16, color: '#1890ff' }}><IconComponent /></span> : null;
        }
        return null;
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                width: '100%',
                padding: '12px 16px',
                marginBottom: 8,
                background: isDragging ? '#e6f7ff' : isNew ? '#e6f7ff' : isModified ? '#fafafa' : '#ffffff',
                borderRadius: 6,
                border: `1px solid ${isDragging ? '#1890ff' : isNew ? '#91d5ff' : isModified ? '#d9d9d9' : '#f0f0f0'}`,
                boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <HolderOutlined
                        {...attributes}
                        {...listeners}
                        style={STYLES.dragHandle}
                    />
                    {renderIcon()}
                    <div style={{ flex: 1 }}>
                        <div style={STYLES.label}>
                            {item.label}
                            {childCount > 0 && (
                                <Tag color="cyan" style={STYLES.badgeTag}>
                                    {childCount} hijo{childCount > 1 ? 's' : ''}
                                </Tag>
                            )}
                            {isNew && <Tag color="blue" style={STYLES.badgeTag}>NUEVO</Tag>}
                            {isModified && <Tag color="orange" style={STYLES.badgeTag}>MODIFICADO</Tag>}
                        </div>
                        <div style={STYLES.url}>
                            {item.url}
                        </div>
                    </div>
                    <Tag
                        color={level === 1 ? 'blue' : level === 2 ? 'green' : level === 3 ? 'orange' : 'red'}
                        style={STYLES.tag}
                    >
                        Nivel {level}
                    </Tag>
                    <Tag
                        color={item.external ? 'orange' : 'blue'}
                        style={STYLES.tag}
                    >
                        {item.external ? 'Externo' : 'Interno'}
                    </Tag>
                    {item.disabled ? (
                        <Tag
                            icon={<StopOutlined />}
                            color="default"
                            style={STYLES.tag}
                        >
                            Deshabilitado
                        </Tag>
                    ) : item.visible ? (
                        <Tag
                            icon={<EyeOutlined />}
                            color="green"
                            style={STYLES.tag}
                        >
                            Visible
                        </Tag>
                    ) : (
                        <Tag
                            icon={<EyeInvisibleOutlined />}
                            color="red"
                            style={STYLES.tag}
                        >
                            Oculto
                        </Tag>
                    )}
                    {!item.external && (
                        <Button
                            type="default"
                            size="middle"
                            icon={<FileTextOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditPage(item.id);
                            }}
                            style={STYLES.button}
                        />
                    )}
                    <Button
                        type="default"
                        size="middle"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(item);
                        }}
                        style={STYLES.button}
                    />
                </div>
            </div>
        </div>
    );
}
