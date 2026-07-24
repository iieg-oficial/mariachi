import { useEffect, useState } from 'react';
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Button, Card, Empty, Form } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import FieldCard from './FieldCard';
import FieldForm from './FieldForm';
import TabsManager from './TabsManager';
import {
    COMMON_TAB, assignColSpan, assignTab, dependentsOf, indicesOfTab, placeAfterTrigger,
    reorderWithinTab, tabOf,
} from './fieldUtils';
import { message } from '@shared/services/message';
import useIsMobile from '@shared/hooks/useIsMobile';
import useSearchParamState from '../../hooks/useSearchParamState';

const fieldKey = (field, idx) => `field-${field?.name ?? idx}`;

const labelOf = (field) => field?.label || field?.name;

export default function FieldsList({ step, onChange, addTrigger }) {
    const [editingKey, setEditingKey] = useState(null);
    const [subtabFromUrl, setSubtab] = useSearchParamState('subtab', COMMON_TAB);
    const [fieldForm] = Form.useForm();
    const { isMobile } = useIsMobile();

    useEffect(() => {
        if (addTrigger) setEditingKey('new');
    }, [addTrigger]);

    const fields = step.fields ?? [];
    const tabs = step.tabs ?? [];
    const showTabs = step.type === 'repeater';

    const showCommon = tabs.length === 0 || indicesOfTab(fields, tabs, COMMON_TAB).length > 0;
    const knownTab = subtabFromUrl === COMMON_TAB || tabs.some((t) => t.id === subtabFromUrl);
    const activeTab = knownTab ? subtabFromUrl : COMMON_TAB;
    const activeKey = !showCommon && activeTab === COMMON_TAB
        ? tabs[0].id
        : activeTab;

    const setActiveTab = (key) => setSubtab(key === COMMON_TAB ? null : key);

    const visibleIdx = showTabs
        ? indicesOfTab(fields, tabs, activeKey)
        : fields.map((_, i) => i);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const from = visibleIdx.findIndex((i) => fieldKey(fields[i], i) === active.id);
        const to = visibleIdx.findIndex((i) => fieldKey(fields[i], i) === over.id);
        if (from < 0 || to < 0) return;
        onChange?.({ ...step, fields: reorderWithinTab(fields, visibleIdx, from, to) });
    };

    const handleMove = (idx, direction) => {
        const from = visibleIdx.indexOf(idx);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= visibleIdx.length) return;
        onChange?.({ ...step, fields: reorderWithinTab(fields, visibleIdx, from, to) });
        const swapped = visibleIdx[to];
        if (editingKey === idx) setEditingKey(swapped);
        else if (editingKey === swapped) setEditingKey(idx);
    };

    const handleDelete = (idx) => {
        if (editingKey === idx) setEditingKey(null);
        onChange?.({ ...step, fields: fields.filter((_, i) => i !== idx) });
    };

    const handleAssignTab = (idx, tabId) => {
        onChange?.({ ...step, fields: assignTab(fields, idx, tabId) });
        const target = tabs.find((t) => t.id === tabId);
        message.info(
            tabId === COMMON_TAB
                ? `«${labelOf(fields[idx])}» ahora se muestra en todos los tabs.`
                : `«${labelOf(fields[idx])}» se movió al tab «${target?.title || tabId}».`,
        );
    };

    const handleAssignColSpan = (idx, colSpan) => {
        onChange?.({ ...step, fields: assignColSpan(fields, idx, colSpan) });
    };

    const handleSaveField = (newField) => {
        const next = [...fields];
        let savedIdx;
        if (editingKey === 'new') {
            next.push(newField);
            savedIdx = next.length - 1;
        } else {
            next[editingKey] = newField;
            savedIdx = editingKey;
        }

        const trigger = next.find((f) => f.name === newField.showWhen?.field);
        const sameTab = trigger && tabOf(trigger, tabs) === tabOf(newField, tabs);
        const placed = sameTab ? placeAfterTrigger(next, savedIdx) : next;
        if (placed !== next) {
            message.info(`«${labelOf(newField)}» se colocó debajo de «${labelOf(trigger)}».`);
        }

        onChange?.({ ...step, fields: placed });
        setEditingKey(null);
    };

    const otherFieldNames = (idx) => fields
        .filter((f, i) => i !== idx && f.name)
        .map((f) => ({
            name: f.name,
            label: f.label,
            type: f.type,
            options: f.options,
            catalog: f.catalog,
            showWhen: f.showWhen,
        }));

    const tabOptions = [
        { value: COMMON_TAB, label: 'Comunes (todos los tabs)' },
        ...tabs.map((t) => ({ value: t.id, label: t.title || t.id })),
    ];

    const activeTabTitle = tabs.find((t) => t.id === activeKey)?.title || activeKey;
    const inNamedTab = showTabs && activeKey !== COMMON_TAB;

    const fieldsGrid = (
        <div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                    items={visibleIdx.map((i) => fieldKey(fields[i], i))}
                    strategy={rectSortingStrategy}
                >
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(6, 1fr)',
                        width: '100%',
                    }}>
                        {visibleIdx.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', padding: 4, boxSizing: 'border-box' }}>
                                <Empty
                                    description={inNamedTab ? 'Sin campos en este tab' : 'Sin campos'}
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                            </div>
                        )}
                        {visibleIdx.map((idx, pos) => (
                            <FieldCard
                                key={fieldKey(fields[idx], idx)}
                                id={fieldKey(fields[idx], idx)}
                                field={fields[idx]}
                                isEditing={editingKey === idx}
                                isMobile={isMobile}
                                showTabs={showTabs}
                                tabs={tabs}
                                tabOptions={tabOptions}
                                canMoveUp={pos > 0}
                                canMoveDown={pos < visibleIdx.length - 1}
                                dependentsCount={dependentsOf(fields, fields[idx].name).length}
                                onMove={(direction) => handleMove(idx, direction)}
                                onToggleEdit={() => setEditingKey((prev) => (prev === idx ? null : idx))}
                                onDelete={() => handleDelete(idx)}
                                onAssignTab={(tabId) => handleAssignTab(idx, tabId)}
                                onAssignColSpan={(colSpan) => handleAssignColSpan(idx, colSpan)}
                                fieldForm={fieldForm}
                                availableShowWhenFields={otherFieldNames(idx)}
                                onSaveField={handleSaveField}
                                onCancelEdit={() => setEditingKey(null)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {editingKey === 'new' ? (
                <Card size="small" style={{ marginTop: 8 }} styles={{ body: { padding: 8 } }} title="Nuevo campo">
                    <FieldForm
                        form={fieldForm}
                        field={inNamedTab ? { tab: activeKey } : null}
                        availableTabs={tabs}
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
                    {inNamedTab ? `Agregar campo a «${activeTabTitle}»` : 'Agregar campo'}
                </Button>
            )}
        </div>
    );

    if (!showTabs) return fieldsGrid;

    return (
        <TabsManager
            tabs={tabs}
            fields={fields}
            activeKey={activeKey}
            onActiveChange={setActiveTab}
            showCommon={showCommon}
            onTabsChange={(nextTabs, nextFields) => onChange?.({ ...step, tabs: nextTabs, fields: nextFields })}
        >
            {fieldsGrid}
        </TabsManager>
    );
}
