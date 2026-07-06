import { useState } from 'react';
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { Button, Card, Empty, Space, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import SortableItem from './SortableItem';
import FieldDrawer from './FieldDrawer';
import { fieldTypeLabel } from '../../constants/definitionTypes';

const fieldKey = (field, idx) => `field-${field?.name ?? idx}`;

export default function FieldsList({ step, onChange }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingIdx, setEditingIdx] = useState(null);

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

    const handleNew = () => {
        setEditingIdx(null);
        setDrawerOpen(true);
    };

    const handleEdit = (idx) => {
        setEditingIdx(idx);
        setDrawerOpen(true);
    };

    const handleDelete = (idx) => {
        onChange?.({ ...step, fields: fields.filter((_, i) => i !== idx) });
    };

    const handleSaveField = (newField) => {
        const next = [...fields];
        if (editingIdx === null) {
            next.push(newField);
        } else {
            next[editingIdx] = newField;
        }
        onChange?.({ ...step, fields: next });
    };

    const ids = fields.map(fieldKey);
    const editingField = editingIdx === null ? null : fields[editingIdx];
    const otherFieldNames = fields
        .map((f, i) => i !== editingIdx ? f.name : null)
        .filter(Boolean);

    return (
        <div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                        {fields.length === 0 && (
                            <Empty description="Sin campos" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                        {fields.map((f, idx) => (
                            <SortableItem key={fieldKey(f, idx)} id={fieldKey(f, idx)}>
                                <Card size="small" styles={{ body: { padding: 8 } }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <div style={{ minWidth: 0 }}>
                                            <strong>{f.label || f.name}</strong>{' '}
                                            <code style={{ fontSize: 12 }}>{f.name}</code>{' '}
                                            <Tag color="blue">{fieldTypeLabel(f.type)}</Tag>
                                            {f.required && <Tag color="red">requerido</Tag>}
                                            {f.tab && <Tag>tab: {f.tab}</Tag>}
                                            {f.showWhen && <Tag color="purple">condicional</Tag>}
                                        </div>
                                        <Space size="small">
                                            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(idx)} />
                                            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(idx)} />
                                        </Space>
                                    </div>
                                </Card>
                            </SortableItem>
                        ))}
                    </Space>
                </SortableContext>
            </DndContext>
            <Button type="dashed" icon={<PlusOutlined />} block style={{ marginTop: 8 }} onClick={handleNew}>
                Agregar campo
            </Button>
            <FieldDrawer
                open={drawerOpen}
                field={editingField}
                availableTabs={step.tabs ?? []}
                availableShowWhenFields={otherFieldNames}
                onSave={handleSaveField}
                onClose={() => setDrawerOpen(false)}
            />
        </div>
    );
}
