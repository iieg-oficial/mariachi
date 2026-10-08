import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Radio, Select, Tabs } from 'antd';
import { EditOutlined, PartitionOutlined } from '@ant-design/icons';
import {
    dropFieldsOfTab,
    indicesOfTab,
    moveFieldsToTab,
    renameTabInFields,
} from './fieldUtils';

const slugify = (text) => (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_').replace(/^_|_$/g, '');

export default function TabsManager({
    tabs = [], fields = [], activeKey, onActiveChange, onTabsChange, children,
}) {
    const [editing, setEditing] = useState(null);
    const [removing, setRemoving] = useState(null);
    const [removeMode, setRemoveMode] = useState('move');
    const [moveTarget, setMoveTarget] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        if (!editing) return;
        form.setFieldsValue({ id: editing.tab?.id ?? '', title: editing.tab?.title ?? '' });
    }, [editing, form]);

    const countOf = (key) => indicesOfTab(fields, tabs, key).length;

    const handleEdit = (targetKey, action) => {
        if (action === 'add') {
            setEditing({ tab: null });
            return;
        }
        const tab = tabs.find((t) => t.id === targetKey);
        if (!tab) return;
        const count = countOf(tab.id);
        const survivors = tabs.filter((t) => t.id !== tab.id);
        if (count === 0 || survivors.length === 0) {
            applyRemove(tab, 'move', survivors[0]?.id ?? null);
            return;
        }
        setRemoveMode('move');
        setMoveTarget(survivors[0].id);
        setRemoving({ tab, count });
    };

    const applyRemove = (tab, mode, targetId) => {
        const nextTabs = tabs.filter((t) => t.id !== tab.id);
        const nextFields = mode === 'drop'
            ? dropFieldsOfTab(fields, tab.id)
            : moveFieldsToTab(fields, tab.id, targetId);
        onTabsChange?.(nextTabs, nextFields);
        if (activeKey === tab.id) onActiveChange?.(targetId ?? nextTabs[0]?.id ?? null);
        setRemoving(null);
    };

    const handleSaveTab = ({ id, title }) => {
        const nextId = slugify(id);
        const isNew = !editing.tab;
        const prevId = editing.tab?.id;

        const nextTabs = isNew
            ? [...tabs, { id: nextId, title }]
            : tabs.map((t) => (t.id === prevId ? { id: nextId, title } : t));
        const nextFields = isNew
            ? (tabs.length === 0 ? fields.map((f) => ({ ...f, tab: nextId })) : fields)
            : renameTabInFields(fields, prevId, nextId);

        onTabsChange?.(nextTabs, nextFields);
        onActiveChange?.(nextId);
        setEditing(null);
    };

    const tabLabel = (tab) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {tab.title || tab.id}
            <span style={{ color: '#999', fontSize: 12 }}>{countOf(tab.id)}</span>
            <EditOutlined
                style={{ color: '#999' }}
                onClick={(e) => {
                    e.stopPropagation();
                    setEditing({ tab });
                }}
            />
        </span>
    );

    const items = tabs.map((t) => ({
        key: t.id,
        closable: true,
        label: tabLabel(t),
        children,
    }));

    return (
        <>
            {tabs.length === 0 ? (
                <>
                    {children}
                    <Button
                        type="link"
                        size="small"
                        icon={<PartitionOutlined />}
                        style={{ marginTop: 8, paddingInline: 0 }}
                        onClick={() => setEditing({ tab: null })}
                    >
                        Dividir en pestañas
                    </Button>
                </>
            ) : (
                <Tabs
                    type="editable-card"
                    activeKey={activeKey}
                    onChange={onActiveChange}
                    onEdit={handleEdit}
                    items={items}
                    addIcon={<span style={{ padding: '0 4px' }}>+ Pestaña</span>}
                />
            )}

            <Modal
                open={!!editing}
                title={editing?.tab ? `Editar pestaña: ${editing.tab.id}` : 'Nueva pestaña'}
                okText="Guardar"
                cancelText="Cancelar"
                onCancel={() => setEditing(null)}
                onOk={() => form.submit()}
                destroyOnHidden
            >
                <Form layout="vertical" form={form} onFinish={handleSaveTab}>
                    {!editing?.tab && tabs.length === 0 && fields.length > 0 && (
                        <Alert
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                            title={`Los ${fields.length} campos del paso quedarán en esta primera pestaña. Después puedes moverlos.`}
                        />
                    )}
                    <Form.Item
                        label="Título"
                        name="title"
                        rules={[{ required: true, message: 'El título es obligatorio.' }]}
                    >
                        <Input
                            placeholder="Datos generales"
                            onChange={(e) => {
                                if (editing?.tab) return;
                                form.setFieldsValue({ id: slugify(e.target.value) });
                            }}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Identificador (sin espacios)"
                        name="id"
                        extra={editing?.tab
                            ? 'Al cambiarlo se reasignan los campos que ya usan esta pestaña.'
                            : undefined}
                        rules={[
                            { required: true, message: 'El identificador es obligatorio.' },
                            { pattern: /^[a-z0-9_]+$/, message: 'Solo minúsculas, dígitos y _' },
                            {
                                validator: (_r, value) => (
                                    tabs.some((t) => t.id === value && t.id !== editing?.tab?.id)
                                        ? Promise.reject(new Error('Ya existe una pestaña con ese identificador.'))
                                        : Promise.resolve()
                                ),
                            },
                        ]}
                    >
                        <Input placeholder="datos_generales" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                open={!!removing}
                title={`Eliminar pestaña: ${removing?.tab?.title || removing?.tab?.id}`}
                okText="Eliminar"
                okButtonProps={{ danger: true }}
                cancelText="Cancelar"
                onCancel={() => setRemoving(null)}
                onOk={() => applyRemove(removing.tab, removeMode, moveTarget)}
                destroyOnHidden
            >
                <p>
                    Esta pestaña tiene {removing?.count} campo{removing?.count === 1 ? '' : 's'} asignado
                    {removing?.count === 1 ? '' : 's'}. ¿Qué quieres hacer con ellos?
                </p>
                <Radio.Group
                    value={removeMode}
                    onChange={(e) => setRemoveMode(e.target.value)}
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                    <Radio value="move">
                        Moverlos a otra pestaña
                        <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
                            Se conservan tal cual, solo cambian de pestaña.
                        </div>
                        <Select
                            value={moveTarget}
                            onChange={setMoveTarget}
                            disabled={removeMode !== 'move'}
                            style={{ width: '100%' }}
                            options={tabs
                                .filter((t) => t.id !== removing?.tab?.id)
                                .map((t) => ({ value: t.id, label: t.title || t.id }))}
                        />
                    </Radio>
                    <Radio value="drop">
                        Eliminarlos junto con la pestaña
                        <div style={{ color: '#888', fontSize: 12 }}>
                            Se borran los {removing?.count} campos del formulario.
                        </div>
                    </Radio>
                </Radio.Group>
            </Modal>
        </>
    );
}
