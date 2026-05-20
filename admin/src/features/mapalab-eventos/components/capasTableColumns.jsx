import { Button, Dropdown, Input, Space, Switch, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, MenuOutlined } from '@ant-design/icons';
import { DragHandleCell } from './CapasSortableRow';

const { Text } = Typography;

const formatMoveDestino = (target, value) => {
    if (target === 'root') return '↑ Raíz';
    const idx = parseInt(target.split('-')[1], 10);
    const cat = value?.[idx];
    return `→ ${cat?.alias || `Categoría ${idx + 1}`}`;
};

const buildMoveMenu = ({ containerId, value, onMoveTo }) => {
    const items = [];
    if (containerId !== 'root') {
        items.push({ key: 'root', label: '↑ Raíz' });
    }
    (value || []).forEach((c, i) => {
        if (c.tipo !== 'categoria') return;
        const target = `cat-${i}`;
        if (target === containerId) return;
        items.push({ key: target, label: formatMoveDestino(target, value) });
    });
    return {
        items,
        onClick: ({ key }) => onMoveTo(key),
    };
};

export const buildCapasColumns = ({
    onUpdate,
    onRemove,
    onMoveTo,
    disabled,
    registeredIndex,
    onEditLayer,
    containerId,
    rootValue,
}) => [
    {
        title: '',
        key: 'handle',
        width: 36,
        align: 'center',
        render: () => <DragHandleCell disabled={disabled} />,
    },
    {
        title: 'Capa / Etiqueta / Categoría',
        key: 'capa',
        render: (_, record, idx) => {
            if (record.tipo === 'etiqueta') {
                return (
                    <Space size={6} style={{ width: '100%' }}>
                        <Tag color="purple" style={{ marginRight: 0 }}>Etiqueta</Tag>
                        <Input
                            size="small"
                            placeholder="Texto de la etiqueta (ej. Servicios públicos)"
                            value={record.alias || ''}
                            onChange={(e) => onUpdate(idx, { alias: e.target.value })}
                            disabled={disabled}
                            style={{ minWidth: 240 }}
                        />
                    </Space>
                );
            }
            if (record.tipo === 'categoria') {
                const childCount = (record.capas || []).length;
                return (
                    <Space size={6} style={{ width: '100%' }} wrap>
                        <Tag color="geekblue" style={{ marginRight: 0 }}>Categoría</Tag>
                        <Input
                            size="small"
                            placeholder="Nombre de la categoría (carpeta)"
                            value={record.alias || ''}
                            onChange={(e) => onUpdate(idx, { alias: e.target.value })}
                            disabled={disabled}
                            style={{ minWidth: 240 }}
                        />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {childCount} {childCount === 1 ? 'elemento' : 'elementos'}
                        </Text>
                    </Space>
                );
            }
            return (
                <Space direction="vertical" size={0}>
                    <Tag color="blue">{record.workspace}:{record.layer}</Tag>
                    <Input
                        size="small"
                        placeholder="Alias mostrado en el panel"
                        value={record.alias || ''}
                        onChange={(e) => onUpdate(idx, { alias: e.target.value })}
                        disabled={disabled}
                        style={{ marginTop: 4, maxWidth: 320 }}
                    />
                </Space>
            );
        },
    },
    {
        title: (
            <Tooltip title="Si está activado, la capa se enciende sola al abrir el evento. Si está apagado, el usuario debe activarla manualmente desde el panel.">
                <span>Auto-activar</span>
            </Tooltip>
        ),
        key: 'autoActivar',
        width: 110,
        align: 'center',
        render: (_, record, idx) => {
            if (record.tipo !== 'capa') return null;
            return (
                <Switch
                    size="small"
                    checked={record.autoActivar !== false}
                    onChange={(val) => onUpdate(idx, { autoActivar: val })}
                    disabled={disabled}
                    checkedChildren="Auto"
                    unCheckedChildren="Manual"
                />
            );
        },
    },
    {
        title: '',
        key: 'acciones',
        width: 130,
        render: (_, record, idx) => {
            const layerId = record.tipo === 'capa'
                ? registeredIndex.get(`${record.workspace}/${record.layer}`)?.id
                : null;
            const showMove = record.tipo !== 'categoria';
            const moveMenu = showMove
                ? buildMoveMenu({ containerId, value: rootValue, onMoveTo: (target) => onMoveTo(idx, target) })
                : null;
            const canMove = moveMenu && moveMenu.items.length > 0;
            return (
                <Space size={4}>
                    {showMove && (
                        <Tooltip title={canMove ? 'Mover a otra categoría o a raíz' : 'No hay otro contenedor disponible'}>
                            <Dropdown menu={moveMenu} disabled={disabled || !canMove} trigger={['click']}>
                                <Button size="small" icon={<MenuOutlined />} aria-label="Mover a otro contenedor" />
                            </Dropdown>
                        </Tooltip>
                    )}
                    {record.tipo === 'capa' && (
                        <Tooltip title={layerId ? 'Editar tarjeta, metadatos y simbologia' : 'Agregala al arbol primero'}>
                            <Button size="small" icon={<EditOutlined />} aria-label="Editar capa" disabled={disabled || !layerId} onClick={() => onEditLayer(layerId)} />
                        </Tooltip>
                    )}
                    <Button danger size="small" icon={<DeleteOutlined />} aria-label="Eliminar fila" disabled={disabled} onClick={() => onRemove(idx)} />
                </Space>
            );
        },
    },
];
