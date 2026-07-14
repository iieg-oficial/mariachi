import { useEffect, useState } from 'react';
import { Form, Input, Modal, Radio, Tabs, Tooltip } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import {
    COMMON_TAB,
    detachFieldsFromTab,
    dropFieldsOfTab,
    indicesOfTab,
    renameTabInFields,
} from './fieldUtils';

const slugify = (text) => (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_').replace(/^_|_$/g, '');

export default function TabsManager({
    tabs = [], fields = [], activeKey, onActiveChange, onTabsChange, showCommon, children,
}) {
    const [editing, setEditing] = useState(null);
    const [removing, setRemoving] = useState(null);
    const [removeMode, setRemoveMode] = useState('detach');
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
        if (count === 0) {
            applyRemove(tab, 'detach');
            return;
        }
        setRemoveMode('detach');
        setRemoving({ tab, count });
    };

    const applyRemove = (tab, mode) => {
        const nextTabs = tabs.filter((t) => t.id !== tab.id);
        const nextFields = mode === 'drop'
            ? dropFieldsOfTab(fields, tab.id)
            : detachFieldsFromTab(fields, tab.id);
        onTabsChange?.(nextTabs, nextFields);
        if (activeKey === tab.id) onActiveChange?.(COMMON_TAB);
        setRemoving(null);
    };

    const handleSaveTab = ({ id, title }) => {
        const nextId = slugify(id);
        const isNew = !editing.tab;
        const prevId = editing.tab?.id;

        const nextTabs = isNew
            ? [...tabs, { id: nextId, title }]
            : tabs.map((t) => (t.id === prevId ? { id: nextId, title } : t));
        const nextFields = isNew ? fields : renameTabInFields(fields, prevId, nextId);

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

    const commonItem = {
        key: COMMON_TAB,
        closable: false,
        label: (
            <Tooltip title="Campos sin tab: se muestran en todos los tabs del item.">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Comunes
                    <span style={{ color: '#999', fontSize: 12 }}>{countOf(COMMON_TAB)}</span>
                </span>
            </Tooltip>
        ),
        children,
    };

    const items = [
        ...(showCommon ? [commonItem] : []),
        ...tabs.map((t) => ({
            key: t.id,
            closable: true,
            label: tabLabel(t),
            children,
        })),
    ];

    return (
        <>
            <Tabs
                type="editable-card"
                activeKey={activeKey}
                onChange={onActiveChange}
                onEdit={handleEdit}
                items={items}
                addIcon={<span style={{ padding: '0 4px' }}>+ Tab</span>}
            />

            <Modal
                open={!!editing}
                title={editing?.tab ? `Editar tab: ${editing.tab.id}` : 'Nuevo tab'}
                okText="Guardar"
                cancelText="Cancelar"
                onCancel={() => setEditing(null)}
                onOk={() => form.submit()}
                destroyOnHidden
            >
                <Form layout="vertical" form={form} onFinish={handleSaveTab}>
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
                            ? 'Al cambiarlo se reasignan los campos que ya usan este tab.'
                            : undefined}
                        rules={[
                            { required: true, message: 'El identificador es obligatorio.' },
                            { pattern: /^[a-z0-9_]+$/, message: 'Solo minúsculas, dígitos y _' },
                            {
                                validator: (_r, value) => (
                                    tabs.some((t) => t.id === value && t.id !== editing?.tab?.id)
                                        ? Promise.reject(new Error('Ya existe un tab con ese identificador.'))
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
                title={`Eliminar tab: ${removing?.tab?.title || removing?.tab?.id}`}
                okText="Eliminar"
                okButtonProps={{ danger: true }}
                cancelText="Cancelar"
                onCancel={() => setRemoving(null)}
                onOk={() => applyRemove(removing.tab, removeMode)}
                destroyOnHidden
            >
                <p>
                    Este tab tiene {removing?.count} campo{removing?.count === 1 ? '' : 's'} asignado
                    {removing?.count === 1 ? '' : 's'}. ¿Qué quieres hacer con ellos?
                </p>
                <Radio.Group
                    value={removeMode}
                    onChange={(e) => setRemoveMode(e.target.value)}
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                    <Radio value="detach">
                        Moverlos a Comunes
                        <div style={{ color: '#888', fontSize: 12 }}>
                            Se conservan y pasarán a mostrarse en todos los tabs.
                        </div>
                    </Radio>
                    <Radio value="drop">
                        Eliminarlos junto con el tab
                        <div style={{ color: '#888', fontSize: 12 }}>
                            Se borran los {removing?.count} campos del formulario.
                        </div>
                    </Radio>
                </Radio.Group>
            </Modal>
        </>
    );
}
