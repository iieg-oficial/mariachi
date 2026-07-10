import { useEffect, useState } from 'react';
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { Button, Card, Empty, Form, Popconfirm, Space, Tag, Tooltip } from 'antd';
import {
    CloseOutlined, DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, SaveOutlined, UpOutlined, ColumnWidthOutlined,
} from '@ant-design/icons';
import SortableItem from './SortableItem';
import FieldForm from './FieldForm';
import { fieldTypeLabel } from '../../constants/definitionTypes';
import useIsMobile from '@shared/hooks/useIsMobile';

const fieldKey = (field, idx) => `field-${field?.name ?? idx}`;

export default function FieldsList({ step, onChange, addTrigger }) {
    const [editingKey, setEditingKey] = useState(null);
    const [fieldForm] = Form.useForm();
    const { isMobile } = useIsMobile();

    useEffect(() => {
        if (addTrigger) setEditingKey('new');
    }, [addTrigger]);

    const fields = step.fields ?? [];
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const fromIdx = fields.findIndex((f, i) => fieldKey(f, i) === active.id);
        const toIdx = fields.findIndex((f, i) => fieldKey(f, i) === over.id);
        if (fromIdx < 0 || toIdx < 0) return;
        onChange?.({ ...step, fields: arrayMove(fields, fromIdx, toIdx) });
    };

    const handleToggleEdit = (idx) => setEditingKey((prev) => (prev === idx ? null : idx));

    const handleMove = (fromIdx, direction) => {
        const toIdx = fromIdx + direction;
        if (toIdx < 0 || toIdx >= fields.length) return;
        onChange?.({ ...step, fields: arrayMove(fields, fromIdx, toIdx) });
        if (editingKey === fromIdx) setEditingKey(toIdx);
        else if (editingKey === toIdx) setEditingKey(fromIdx);
    };

    const handleDelete = (idx) => {
        if (editingKey === idx) setEditingKey(null);
        onChange?.({ ...step, fields: fields.filter((_, i) => i !== idx) });
    };

    const handleSaveField = (newField) => {
        const next = [...fields];
        if (editingKey === 'new') {
            next.push(newField);
        } else {
            next[editingKey] = newField;
        }
        onChange?.({ ...step, fields: next });
        setEditingKey(null);
    };

    const otherFieldNames = (idx) => fields
        .map((f, i) => (i !== idx ? f.name : null))
        .filter(Boolean);

    const ids = fields.map(fieldKey);

    return (
        <div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={ids} strategy={rectSortingStrategy}>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        width: '100%',
                    }}>
                        {fields.length === 0 && (
                            <div style={{ width: '100%', padding: 4, boxSizing: 'border-box' }}>
                                <Empty description="Sin campos" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            </div>
                        )}
                        {fields.map((f, idx) => {
                            const isEditing = editingKey === idx;
                            const cs = f.layout?.colSpan ?? 1;
                            const widthPct = isEditing ? 100 : (cs === 2 ? 50 : cs === 3 ? 33.333 : 100);
                            const isCompact = isMobile || cs >= 2;

                            const actionButtons = (
                                <Space size="small" direction={isCompact && !isMobile ? 'vertical' : 'horizontal'}>
                                    {isMobile && (
                                        <>
                                            <Tooltip title="Subir">
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    icon={<UpOutlined />}
                                                    disabled={idx === 0}
                                                    onClick={() => handleMove(idx, -1)}
                                                />
                                            </Tooltip>
                                            <Tooltip title="Bajar">
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    icon={<DownOutlined />}
                                                    disabled={idx >= fields.length - 1}
                                                    onClick={() => handleMove(idx, 1)}
                                                />
                                            </Tooltip>
                                        </>
                                    )}
                                    {isEditing && (
                                        <Tooltip title="Guardar cambios" placement="left">
                                            <Button
                                                type={isCompact ? 'link' : 'primary'}
                                                size="small"
                                                icon={<SaveOutlined />}
                                                onClick={() => fieldForm.submit()}
                                            >
                                                {!isCompact && 'Guardar'}
                                            </Button>
                                        </Tooltip>
                                    )}
                                    <Tooltip title={isEditing ? 'Cerrar edición' : 'Editar'} placement="left">
                                        <Button
                                            type="link"
                                            size="small"
                                            icon={isEditing ? <CloseOutlined /> : <EditOutlined />}
                                            onClick={() => handleToggleEdit(idx)}
                                        />
                                    </Tooltip>
                                    <Popconfirm
                                        title="¿Eliminar este campo?"
                                        okText="Eliminar"
                                        okButtonProps={{ danger: true }}
                                        cancelText="Cancelar"
                                        onConfirm={() => handleDelete(idx)}
                                    >
                                        <Tooltip title="Eliminar" placement="left">
                                            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                                        </Tooltip>
                                    </Popconfirm>
                                </Space>
                            );

                            return (
                                <SortableItem
                                    key={fieldKey(f, idx)}
                                    id={fieldKey(f, idx)}
                                    dragHandle={!isMobile}
                                    wrapperStyle={{
                                        width: isMobile ? '100%' : `${widthPct}%`,
                                        padding: 4,
                                        boxSizing: 'border-box',
                                    }}
                                    gripFooter={isCompact && !isMobile ? actionButtons : null}
                                >
                                    <Card
                                        size="small"
                                        styles={{ body: { padding: isCompact ? '8px' : '4px 8px' } }}
                                    >
                                        {isCompact ? (
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8,
                                            }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 10,
                                                    }}>
                                                        <strong>{f.label || f.name}</strong>
                                                        <code style={{ fontSize: 12 }}>{f.name}</code>
                                                    </div>
                                                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        <Tag color="blue">{fieldTypeLabel(f.type)}</Tag>
                                                        {f.required && <Tag color="red">Requerido</Tag>}
                                                        {f.tab && <Tag>Tab: {f.tab}</Tag>}
                                                        {f.showWhen && <Tag color="purple">Condicionado</Tag>}
                                                        <Tag icon={<ColumnWidthOutlined />} color="geekblue">
                                                            {cs === 3 ? 'Chico' : cs === 2 ? 'Mediano' : 'Grande'}
                                                        </Tag>
                                                    </div>
                                                </div>
                                                {isMobile && actionButtons}
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                minWidth: 0,
                                            }}>
                                                <strong>{f.label || f.name}</strong>
                                                <code style={{ fontSize: 12 }}>{f.name}</code>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                                    <Tag color="blue">{fieldTypeLabel(f.type)}</Tag>
                                                    {f.required && <Tag color="red">Requerido</Tag>}
                                                    {f.tab && <Tag>Tab: {f.tab}</Tag>}
                                                    {f.showWhen && <Tag color="purple">Condicionado</Tag>}
                                                    <Tag icon={<ColumnWidthOutlined />} color="geekblue">
                                                        {cs === 3 ? 'Chico' : cs === 2 ? 'Mediano' : 'Grande'}
                                                    </Tag>
                                                </div>
                                                <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                                                    {actionButtons}
                                                </div>
                                            </div>
                                        )}
                                        {isEditing && (
                                            <FieldForm
                                                form={fieldForm}
                                                field={f}
                                                availableTabs={step.tabs ?? []}
                                                availableShowWhenFields={otherFieldNames(idx)}
                                                onSave={handleSaveField}
                                                onCancel={() => setEditingKey(null)}
                                            />
                                        )}
                                    </Card>
                                </SortableItem>
                            );
                        })}
                    </div>
                </SortableContext>
            </DndContext>

            {editingKey === 'new' ? (
                <Card size="small" style={{ marginTop: 8 }} styles={{ body: { padding: 8 } }} title="Nuevo campo">
                    <FieldForm
                        form={fieldForm}
                        field={null}
                        availableTabs={step.tabs ?? []}
                        availableShowWhenFields={otherFieldNames(null)}
                        onSave={handleSaveField}
                        onCancel={() => setEditingKey(null)}
                    />
                </Card>
            ) : (
                <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    block
                    style={{ marginTop: 8 }}
                    onClick={() => setEditingKey('new')}
                >
                    Agregar campo
                </Button>
            )}
        </div>
    );
}
