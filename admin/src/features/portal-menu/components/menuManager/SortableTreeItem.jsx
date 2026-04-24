import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tag, Button } from 'antd';
import { EditOutlined, FileTextOutlined, HolderOutlined, EyeOutlined, EyeInvisibleOutlined, StopOutlined } from '@ant-design/icons';
import { getIconComponent } from '@features/portal-menu/utils/menuUtils';
import useIsMobile from '@shared/hooks/useIsMobile';

const STYLES = {
    dragHandle: {
        color: '#999',
        cursor: 'grab',
        fontSize: 16,
        touchAction: 'none',
        flexShrink: 0
    },
    label: {
        fontWeight: 500,
        fontSize: 15,
        color: '#262626',
        marginBottom: 4,
        wordBreak: 'break-word'
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
    const { isMobile } = useIsMobile();
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

    const indent = isMobile ? (level - 1) * 16 : (level - 1) * 32;

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        marginLeft: indent
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

    const statusTag = item.disabled ? (
        <Tag icon={<StopOutlined />} color="default" style={STYLES.tag}>
            {isMobile ? '' : 'Deshabilitado'}
        </Tag>
    ) : item.visible ? (
        <Tag icon={<EyeOutlined />} color="green" style={STYLES.tag}>
            {isMobile ? '' : 'Visible'}
        </Tag>
    ) : (
        <Tag icon={<EyeInvisibleOutlined />} color="red" style={STYLES.tag}>
            {isMobile ? '' : 'Oculto'}
        </Tag>
    );

    return (
        <div ref={setNodeRef} style={style}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                width: '100%',
                padding: isMobile ? '10px 12px' : '12px 16px',
                marginBottom: 8,
                background: isDragging ? '#e6f7ff' : isNew ? '#e6f7ff' : isModified ? '#fafafa' : '#ffffff',
                borderRadius: 6,
                border: `1px solid ${isDragging ? '#1890ff' : isNew ? '#91d5ff' : isModified ? '#d9d9d9' : '#f0f0f0'}`,
                boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? 8 : 12,
                    flexWrap: 'wrap'
                }}>
                    <HolderOutlined
                        {...attributes}
                        {...listeners}
                        style={STYLES.dragHandle}
                    />
                    {renderIcon()}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={STYLES.label}>
                            {item.label}
                            {childCount > 0 && (
                                <Tag color="cyan" style={STYLES.badgeTag}>
                                    {childCount} hijo{childCount > 1 ? 's' : ''}
                                </Tag>
                            )}
                            {isNew && <Tag color="blue" style={STYLES.badgeTag}>NUEVO</Tag>}
                            {isModified && <Tag color="orange" style={STYLES.badgeTag}>MODIF</Tag>}
                        </div>
                        <div style={STYLES.url}>
                            {item.url}
                        </div>
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                        marginLeft: isMobile ? 0 : 'auto'
                    }}>
                        {!isMobile && (
                            <Tag
                                color={level === 1 ? 'blue' : level === 2 ? 'green' : level === 3 ? 'orange' : 'red'}
                                style={STYLES.tag}
                            >
                                Nivel {level}
                            </Tag>
                        )}
                        {!isMobile && (
                            <Tag
                                color={item.external ? 'orange' : 'blue'}
                                style={STYLES.tag}
                            >
                                {item.external ? 'Externo' : 'Interno'}
                            </Tag>
                        )}
                        {statusTag}
                        {!item.external && (
                            <Button
                                type="default"
                                size={isMobile ? 'small' : 'middle'}
                                icon={<FileTextOutlined />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditPage(item.id);
                                }}
                                style={STYLES.button}
                                aria-label="Editar página"
                            />
                        )}
                        <Button
                            type="default"
                            size={isMobile ? 'small' : 'middle'}
                            icon={<EditOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(item);
                            }}
                            style={STYLES.button}
                            aria-label="Editar item"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
