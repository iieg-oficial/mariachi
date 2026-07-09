import { useState } from 'react';
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { Button, Card, Empty, Form, Popconfirm, Space, Tag } from 'antd';
import {
    DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined, UpOutlined,
} from '@ant-design/icons';
import SortableItem from './SortableItem';
import FieldForm from './FieldForm';
import { fieldTypeLabel } from '../../constants/definitionTypes';

const fieldKey = (field, idx) => `field-${field?.name ?? idx}`;

export default function FieldsList({ step, onChange }) {
    const [editingKey, setEditingKey] = useState(null);
    const [fieldForm] = Form.useForm();

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
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                        {fields.length === 0 && (
                            <Empty description="Sin campos" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                        {fields.map((f, idx) => {
                            const isEditing = editingKey === idx;
                            return (
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
                                                {isEditing && (
                                                    <Button
                                                        type="primary"
                                                        size="small"
                                                        icon={<SaveOutlined />}
                                                        onClick={() => fieldForm.submit()}
                                                    >
                                                        Guardar
                                                    </Button>
                                                )}
                                                <Button
                                                    type={isEditing ? 'default' : 'link'}
                                                    size="small"
                                                    icon={isEditing ? <UpOutlined /> : <EditOutlined />}
                                                    onClick={() => handleToggleEdit(idx)}
                                                />
                                                <Popconfirm
                                                    title="¿Eliminar este campo?"
                                                    okText="Eliminar"
                                                    okButtonProps={{ danger: true }}
                                                    cancelText="Cancelar"
                                                    onConfirm={() => handleDelete(idx)}
                                                >
                                                    <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                                                </Popconfirm>
                                            </Space>
                                        </div>
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
                    </Space>
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
