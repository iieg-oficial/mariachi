import { useState } from 'react';
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { Button, Card, Empty, Space, Tag, Typography } from 'antd';
import {
    DeleteOutlined, EditOutlined, PlusOutlined,
} from '@ant-design/icons';
import SortableItem from './SortableItem';
import FieldsList from './FieldsList';
import StepDrawer from './StepDrawer';

const stepKey = (step, idx) => `step-${step?.id ?? idx}`;

export default function StepsList({ steps, onChange }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingIdx, setEditingIdx] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const fromIdx = steps.findIndex((s, i) => stepKey(s, i) === active.id);
        const toIdx = steps.findIndex((s, i) => stepKey(s, i) === over.id);
        if (fromIdx < 0 || toIdx < 0) return;
        onChange?.(arrayMove(steps, fromIdx, toIdx));
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
        onChange?.(steps.filter((_, i) => i !== idx));
    };

    const handleSaveStep = (newStep) => {
        const next = [...steps];
        if (editingIdx === null) {
            next.push(newStep);
        } else {
            next[editingIdx] = { ...next[editingIdx], ...newStep };
        }
        onChange?.(next);
    };

    const handleStepFieldsChange = (idx, updatedStep) => {
        const next = [...steps];
        next[idx] = updatedStep;
        onChange?.(next);
    };

    const ids = steps.map(stepKey);
    const editingStep = editingIdx === null ? null : steps[editingIdx];

    return (
        <div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        {steps.length === 0 && (
                            <Empty description="Sin pasos. Agrega el primero." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                        {steps.map((s, idx) => (
                            <SortableItem key={stepKey(s, idx)} id={stepKey(s, idx)}>
                                <Card size="small">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div>
                                            <Typography.Text strong>{s.title || s.id}</Typography.Text>{' '}
                                            <code style={{ fontSize: 12 }}>{s.id}</code>{' '}
                                            <Tag color={s.type === 'repeater' ? 'orange' : s.type === 'summary' ? 'green' : 'blue'}>{s.type}</Tag>
                                            {s.tabs?.length > 0 && <Tag>{s.tabs.length} tabs</Tag>}
                                        </div>
                                        <Space size="small">
                                            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(idx)}>Step</Button>
                                            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(idx)} />
                                        </Space>
                                    </div>
                                    {s.type !== 'summary' && (
                                        <FieldsList
                                            step={s}
                                            onChange={(updated) => handleStepFieldsChange(idx, updated)}
                                        />
                                    )}
                                </Card>
                            </SortableItem>
                        ))}
                    </Space>
                </SortableContext>
            </DndContext>
            <Button type="dashed" icon={<PlusOutlined />} block style={{ marginTop: 12 }} onClick={handleNew}>
                Agregar step
            </Button>
            <StepDrawer
                open={drawerOpen}
                step={editingStep}
                onSave={handleSaveStep}
                onClose={() => setDrawerOpen(false)}
            />
        </div>
    );
}
