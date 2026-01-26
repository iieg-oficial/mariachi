import { Tag, Space, Button } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HolderOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { getIconComponent } from '@utils/menuUtils';
import { MAX_LEVEL } from '@constants/menuConstants';

export default function MenuItemNode({
    item,
    level,
    customIcons,
    isNew,
    isModified,
    onAddChild,
    onEdit,
    onDelete
}) {
    const navigate = useNavigate();
    const canAddChild = level < MAX_LEVEL;

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
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            width: '100%',
            padding: '12px 16px',
            background: isNew ? '#e6f7ff' : isModified ? '#fff7e6' : '#fafafa',
            borderRadius: 6,
            border: `1px solid ${isNew ? '#91d5ff' : isModified ? '#ffd591' : '#f0f0f0'}`
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <HolderOutlined style={{ color: '#999', cursor: 'grab', fontSize: 16 }} />
                {renderIcon()}
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontWeight: 500,
                        fontSize: 15,
                        color: '#262626',
                        marginBottom: 4
                    }}>
                        {item.label}
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
                <Tag
                    color={item.visible ? 'green' : 'red'}
                    style={{ margin: 0, fontSize: 13, padding: '2px 8px' }}
                >
                    {item.visible ? 'Visible' : 'Oculto'}
                </Tag>
                <Space size="small">
                    {!item.external && (
                        <Button
                            type="primary"
                            size="middle"
                            icon={<FileTextOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/pages/edit/${item.id}`);
                            }}
                            style={{ fontSize: 14 }}
                        >
                            Editar Página
                        </Button>
                    )}
                    {canAddChild && (
                        <Button
                            type="default"
                            size="middle"
                            icon={<PlusOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddChild(item);
                            }}
                            style={{ fontSize: 14 }}
                        >
                            Agregar hijo
                        </Button>
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
                    <Button
                        type="default"
                        size="middle"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item);
                        }}
                        style={{ fontSize: 14 }}
                    />
                </Space>
            </div>
        </div>
    );
}
