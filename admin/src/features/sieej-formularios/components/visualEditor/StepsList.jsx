import { cloneElement, useState } from 'react';
import {
    DndContext, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, arrayMove, horizontalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Card, Empty, Popconfirm, Space, Tabs, Tag, Tooltip } from 'antd';
import {
    DeleteOutlined, EditOutlined, PlusOutlined,
} from '@ant-design/icons';
import useIsMobile from '@shared/hooks/useIsMobile';
import FieldsList from './FieldsList';
import StepDrawer from './StepDrawer';
import { stepTypeLabel } from '../../constants/definitionTypes';

const stepKey = (step, idx) => `step-${step?.id ?? idx}`;

const TYPE_COLOR = { form: 'blue', repeater: 'orange', summary: 'green' };

const SMALL_TAG_STYLE = {
    fontSize: 10,
    lineHeight: '16px',
    paddingInline: 5,
    marginInlineEnd: 4,
    marginInlineStart: 0,
};

function DraggableTabNode(props) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: props['data-node-key'] });

    const style = {
        ...props.children.props.style,
        transform: CSS.Translate.toString(transform),
        transition,
        cursor: 'move',
        opacity: isDragging ? 0.6 : 1,
    };

    return cloneElement(props.children, {
        ref: setNodeRef, style, ...attributes, ...listeners,
    });
}

export default function StepsList({ steps, onChange }) {
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingIdx, setEditingIdx] = useState(null);
    const [activeKey, setActiveKey] = useState(null);
    const [fieldAddTarget, setFieldAddTarget] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

    const ids = steps.map(stepKey);
    const currentKey = ids.includes(activeKey) ? activeKey : ids[0];

    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const fromIdx = ids.indexOf(active.id);
        const toIdx = ids.indexOf(over.id);
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
        setActiveKey(stepKey(newStep, editingIdx ?? next.length - 1));
    };

    const handleStepFieldsChange = (idx, updatedStep) => {
        const next = [...steps];
        next[idx] = updatedStep;
        onChange?.(next);
    };

    const editingStep = editingIdx === null ? null : steps[editingIdx];

    const items = steps.map((s, idx) => ({
        key: stepKey(s, idx),
        label: (
            <div style={{ textAlign: 'start', lineHeight: 1.4 }}>
                <div>{s.title || s.id}</div>
                <div>
                    <Tag color={TYPE_COLOR[s.type] || 'default'} style={SMALL_TAG_STYLE}>
                        {stepTypeLabel(s.type)}
                    </Tag>
                    {s.incompleteNotice && (
                        <Tag color="gold" style={SMALL_TAG_STYLE}>aviso</Tag>
                    )}
                </div>
            </div>
        ),
        children: (
            <Card size="small">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Space size="small">
                        <Tooltip title="Agregar campo">
                            <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => setFieldAddTarget({ idx, ts: Date.now() })} />
                        </Tooltip>
                        <Tooltip title="Editar paso">
                            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(idx)} />
                        </Tooltip>
                        <Popconfirm
                            title="¿Eliminar este paso?"
                            description="Se eliminará el paso y todos sus campos."
                            okText="Eliminar"
                            okButtonProps={{ danger: true }}
                            cancelText="Cancelar"
                            onConfirm={() => handleDelete(idx)}
                        >
                            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Space>
                    <div>
                        <code style={{ fontSize: 12 }}>{s.id}</code>
                        {s.tabs?.length > 0 && <Tag style={{ marginInlineStart: 8 }}>{s.tabs.length} tabs</Tag>}
                    </div>
                </div>
                {s.type !== 'summary' && (
                    <FieldsList
                        step={s}
                        onChange={(updated) => handleStepFieldsChange(idx, updated)}
                        addTrigger={fieldAddTarget?.idx === idx ? fieldAddTarget : null}
                    />
                )}
            </Card>
        ),
    }));

    return (
        <div>
            {steps.length === 0 ? (
                <>
                    <Empty description="Sin pasos. Agrega el primero." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    <Button type="dashed" icon={<PlusOutlined />} block style={{ marginTop: 12 }} onClick={handleNew}>
                        Agregar paso
                    </Button>
                </>
            ) : (
                <>
                    <Tabs
                        activeKey={currentKey}
                        onChange={setActiveKey}
                        items={items}
                        tabBarExtraContent={(
                            <Button
                                type="dashed"
                                icon={<PlusOutlined />}
                                onClick={handleNew}
                                style={isMobile ? { marginInlineStart: 8 } : undefined}
                            >
                                {isMobile ? null : 'Agregar paso'}
                            </Button>
                        )}
                        renderTabBar={(tabBarProps, DefaultTabBar) => (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
                                    <DefaultTabBar {...tabBarProps}>
                                        {(node) => (
                                            <DraggableTabNode {...node.props} key={node.key}>
                                                {node}
                                            </DraggableTabNode>
                                        )}
                                    </DefaultTabBar>
                                </SortableContext>
                            </DndContext>
                        )}
                    />
                </>
            )}
            <StepDrawer
                open={drawerOpen}
                step={editingStep}
                onSave={handleSaveStep}
                onClose={() => setDrawerOpen(false)}
            />
        </div>
    );
}
