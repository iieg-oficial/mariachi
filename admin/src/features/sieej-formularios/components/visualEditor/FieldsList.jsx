import { useEffect, useMemo, useState } from 'react';
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Button, Card, Empty, Form, Popconfirm, Space, Tooltip } from 'antd';
import { PlusOutlined, SnippetsOutlined } from '@ant-design/icons';
import FieldCard from './FieldCard';
import FieldForm from './FieldForm';
import TabsManager from './TabsManager';
import {
    assignColSpan, assignTab, dependentsOf, indicesOfTab, needsTabNormalization, normalizeTabs,
    placeAfterTrigger, reorderWithinTab, tabOf,
} from './fieldUtils';
import {
    clearFieldClipboard, prepareFieldForPaste, readFieldClipboard, writeFieldClipboard,
} from './fieldClipboard';
import { message } from '@shared/services/message';
import useAccessibleBuckets from '@features/acervo/hooks/useAccessibleBuckets';
import useIsMobile from '@shared/hooks/useIsMobile';
import useCatalogos from '../../hooks/useCatalogos';
import useSearchParamState from '../../hooks/useSearchParamState';
import { fieldTypeLabel } from '../../constants/definitionTypes';

const fieldKey = (field, idx) => `field-${field?.name ?? idx}`;

const labelOf = (field) => field?.label || field?.name;

const pasteDescription = (field, clipboard, hasTabs, activeTabTitle) => {
    const partes = [`Tipo ${fieldTypeLabel(field.type)}`];
    if (field.validation?.pattern) partes.push('con patrón de validación');
    if (field.catalog) partes.push(`catálogo «${field.catalog}»`);
    if (field.options?.length) partes.push(`${field.options.length} opciones`);
    const origen = clipboard?.from?.step ? ` · copiado de «${clipboard.from.step}»` : '';
    const destino = hasTabs ? ` Se agregará a «${activeTabTitle}».` : '';
    return `${partes.join(', ')}${origen}.${destino}`;
};

export default function FieldsList({ step, formularioSlug, onChange, addTrigger }) {
    const [editingKey, setEditingKey] = useState(null);
    const [subtabFromUrl, setSubtab] = useSearchParamState('subtab', null);
    const [clipboard, setClipboard] = useState(() => readFieldClipboard());
    const [fieldForm] = Form.useForm();
    const { isMobile } = useIsMobile();
    const { catalogos } = useCatalogos();
    const { buckets } = useAccessibleBuckets();

    useEffect(() => {
        if (addTrigger) setEditingKey('new');
    }, [addTrigger]);

    const fields = useMemo(() => step.fields ?? [], [step.fields]);
    const tabs = useMemo(() => step.tabs ?? [], [step.tabs]);
    const hasTabs = step.type === 'repeater' && tabs.length > 0;

    useEffect(() => {
        if (!needsTabNormalization(fields, tabs)) return;
        const normalized = normalizeTabs(fields, tabs);
        const moved = normalized.filter((f, i) => f !== fields[i]).length;
        onChange?.({ ...step, fields: normalized });
        message.info(
            `${moved} campo${moved === 1 ? '' : 's'} sin pestaña se asignó a «${tabs[0].title || tabs[0].id}».`,
        );
    }, [fields, tabs, step, onChange]);

    const activeKey = hasTabs && tabs.some((t) => t.id === subtabFromUrl)
        ? subtabFromUrl
        : tabs[0]?.id;

    const setActiveTab = (key) => setSubtab(key);

    const visibleIdx = hasTabs
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
        message.info(`«${labelOf(fields[idx])}» se movió a «${target?.title || tabId}».`);
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

    const handleCopy = (idx) => {
        writeFieldClipboard([fields[idx]], { formulario: formularioSlug, step: step.id });
        setClipboard(readFieldClipboard());
        message.success(`«${labelOf(fields[idx])}» copiado. Pégalo en este u otro formulario.`);
    };

    const insertField = (source) => {
        const { field, warnings } = prepareFieldForPaste(source, {
            fields,
            tabs,
            targetTab: activeKey,
            catalogos,
            buckets,
        });
        onChange?.({ ...step, fields: [...fields, field] });
        message.success(`«${labelOf(field)}» se agregó al final del paso.`);
        warnings.forEach((w) => message.warning(w));
    };

    const handleDuplicate = (idx) => insertField(fields[idx]);

    const handlePaste = () => {
        const payload = readFieldClipboard();
        if (!payload) {
            setClipboard(null);
            message.warning('El portapapeles está vacío.');
            return;
        }
        payload.fields.forEach(insertField);
    };

    const handleClearClipboard = () => {
        clearFieldClipboard();
        setClipboard(null);
    };

    const tabOptions = tabs.map((t) => ({ value: t.id, label: t.title || t.id }));

    const activeTabTitle = tabs.find((t) => t.id === activeKey)?.title || activeKey;
    const clipboardField = clipboard?.fields?.[0] ?? null;

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
                                    description={hasTabs ? 'Sin campos en esta pestaña' : 'Sin campos'}
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
                                showTabs={hasTabs}
                                tabs={tabs}
                                tabOptions={tabOptions}
                                canMoveUp={pos > 0}
                                canMoveDown={pos < visibleIdx.length - 1}
                                dependentsCount={dependentsOf(fields, fields[idx].name).length}
                                onMove={(direction) => handleMove(idx, direction)}
                                onToggleEdit={() => setEditingKey((prev) => (prev === idx ? null : idx))}
                                onDelete={() => handleDelete(idx)}
                                onCopy={() => handleCopy(idx)}
                                onDuplicate={() => handleDuplicate(idx)}
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
                        field={hasTabs ? { tab: activeKey } : null}
                        availableTabs={tabs}
                        availableShowWhenFields={otherFieldNames(null)}
                        onSave={handleSaveField}
                        onCancel={() => setEditingKey(null)}
                    />
                </Card>
            ) : (
                <Space.Compact block style={{ marginTop: 8 }}>
                    <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        style={{ flex: 1 }}
                        onClick={() => setEditingKey('new')}
                    >
                        {hasTabs ? `Agregar campo a «${activeTabTitle}»` : 'Agregar campo'}
                    </Button>
                    {clipboardField && (
                        <Popconfirm
                            title={`Pegar «${clipboardField.label || clipboardField.name}»`}
                            description={pasteDescription(clipboardField, clipboard, hasTabs, activeTabTitle)}
                            okText="Pegar"
                            cancelText="Vaciar portapapeles"
                            cancelButtonProps={{ danger: true }}
                            onConfirm={handlePaste}
                            onCancel={handleClearClipboard}
                        >
                            <Tooltip title="Pegar el campo copiado">
                                <Button type="dashed" icon={<SnippetsOutlined />}>
                                    {isMobile ? null : `Pegar «${clipboardField.label || clipboardField.name}»`}
                                </Button>
                            </Tooltip>
                        </Popconfirm>
                    )}
                </Space.Compact>
            )}
        </div>
    );

    if (step.type !== 'repeater') return fieldsGrid;

    return (
        <TabsManager
            tabs={tabs}
            fields={fields}
            activeKey={activeKey}
            onActiveChange={setActiveTab}
            onTabsChange={(nextTabs, nextFields) => onChange?.({ ...step, tabs: nextTabs, fields: nextFields })}
        >
            {fieldsGrid}
        </TabsManager>
    );
}
