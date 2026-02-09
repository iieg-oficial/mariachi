import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tag, Space, Button } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HolderOutlined, FileTextOutlined, EyeOutlined, EyeInvisibleOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { getIconComponent } from '@utils/menuUtils';
import { MAX_LEVEL } from '@constants/menuConstants';
import DisabledFeature from '@components/common/DisabledFeature';

export default function SortableTreeItem({
    item,
    level,
    customIcons,
    isNew,
    isModified,
    onAddChild,
    onEdit,
    onDelete,
    childCount = 0
}) {
    const navigate = useNavigate();
    const canAddChild = level < MAX_LEVEL;

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
                        style={{
                            color: '#999',
                            cursor: 'grab',
                            fontSize: 16,
                            touchAction: 'none'
                        }}
                    />
                    {renderIcon()}
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontWeight: 500,
                            fontSize: 15,
                            color: '#262626',
                            marginBottom: 4
                        }}>
                            {item.label}
                            {childCount > 0 && (
                                <Tag color="cyan" style={{ marginLeft: 8, fontSize: 11 }}>
                                    {childCount} hijo{childCount > 1 ? 's' : ''}
                                </Tag>
                            )}
                            {isNew && <Tag color="blue" style={{ marginLeft: 8, fontSize: 11 }}>NUEVO</Tag>}
                            {isModified && <Tag color="orange" style={{ marginLeft: 8, fontSize: 11 }}>MODIFICADO</Tag>}
                        </div>
                        <div style={{
                            fontSize: 13,
                            color: '#8c8c8c',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all'
                        }}>
                            {item.url}
                        </div>
                    </div>
                    <Tag
                        color={level === 1 ? 'blue' : level === 2 ? 'green' : level === 3 ? 'orange' : 'red'}
                        style={{ margin: 0, fontSize: 13, padding: '2px 8px' }}
                    >
                        Nivel {level}
                    </Tag>
                    <Tag
                        color={item.external ? 'orange' : 'blue'}
                        style={{ margin: 0, fontSize: 13, padding: '2px 8px' }}
                    >
                        {item.external ? 'Externo' : 'Interno'}
                    </Tag>
                    {item.disabled ? (
                        <Tag
                            icon={<StopOutlined />}
                            color="default"
                            style={{ margin: 0, fontSize: 13, padding: '2px 8px' }}
                        >
                            Deshabilitado
                        </Tag>
                    ) : item.visible ? (
                        <Tag
                            icon={<EyeOutlined />}
                            color="green"
                            style={{ margin: 0, fontSize: 13, padding: '2px 8px' }}
                        >
                            Visible
                        </Tag>
                    ) : (
                        <Tag
                            icon={<EyeInvisibleOutlined />}
                            color="red"
                            style={{ margin: 0, fontSize: 13, padding: '2px 8px' }}
                        >
                            Oculto
                        </Tag>
                    )}
                    <Space size="small">
                        {!item.external && (
                            <DisabledFeature>
                                <Button
                                    type="primary"
                                    size="middle"
                                    icon={<FileTextOutlined />}
                                    onClick={(_e) => navigate(`/menu-manager/edit-page/${item.id}`)}
                                    disabled
                                    style={{ fontSize: 14 }}
                                >
                                    Editar Página
                                </Button>
                            </DisabledFeature>
                        )}
                        {canAddChild && (
                            <DisabledFeature>
                                <Button
                                    type="default"
                                    size="middle"
                                    icon={<PlusOutlined />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddChild(item);
                                    }}
                                    disabled
                                    style={{ fontSize: 14 }}
                                >
                                    Agregar hijo
                                </Button>
                            </DisabledFeature>
                        )}
                        <Button
                            type="default"
                            size="middle"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(item);
                            }}
                            style={{ fontSize: 14 }}
                        />
                        <DisabledFeature>
                            <Button
                                type="default"
                                size="middle"
                                danger
                                disabled
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(item);
                                }}
                                icon={<DeleteOutlined />}
                                style={{ fontSize: 14 }}
                            />
                        </DisabledFeature>
                    </Space>
                </div>
            </div>
        </div>
    );
}
