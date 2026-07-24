import { useEffect, useRef, useState } from 'react';
import { Button, Form, Input, Popconfirm, Table, Typography, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
    DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DragHandleCell, SortableTableRow } from '@shared/components/SortableTableRow';
import InstitucionLogoCell from './InstitucionLogoCell';
import {
    actualizarInstitucion,
    crearInstitucion,
    eliminarInstitucion,
    reorderInstituciones,
} from '../api/catalogoService';

const { Text } = Typography;

const TABLE_COMPONENTS = { body: { row: SortableTableRow } };

const slugify = (text) => (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

const EditableText = ({ value, onSave, placeholder, code = false }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    const commit = async () => {
        setEditing(false);
        const next = (draft || '').trim();
        if (!next || next === value) {
            setDraft(value);
            return;
        }
        setSaving(true);
        try {
            await onSave(next);
        } catch {
            setDraft(value);
        } finally {
            setSaving(false);
        }
    };

    if (editing) {
        return (
            <Input
                ref={inputRef}
                size="small"
                value={draft}
                disabled={saving}
                placeholder={placeholder}
                onChange={(e) => setDraft(e.target.value)}
                onPressEnter={commit}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
            />
        );
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => { setDraft(value); setEditing(true); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setDraft(value); setEditing(true); } }}
            title="Clic para editar"
            style={{ cursor: 'pointer', minHeight: 24 }}
        >
            {code ? <code>{value}</code> : value}
        </div>
    );
};

const InstitucionesPanel = ({ instituciones, capas, onChanged }) => {
    const [form] = Form.useForm();
    const [creating, setCreating] = useState(false);
    const slugTocadoRef = useRef(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleCreate = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }
        setCreating(true);
        try {
            await crearInstitucion(values);
            message.success('Institución creada');
            form.resetFields();
            slugTocadoRef.current = false;
            onChanged?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo crear la institución');
        } finally {
            setCreating(false);
        }
    };

    const handleSave = async (id, payload) => {
        try {
            await actualizarInstitucion(id, payload);
            onChanged?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo guardar la institución');
            throw err;
        }
    };

    const handleDelete = async (institucion) => {
        try {
            await eliminarInstitucion(institucion.id);
            message.success('Institución eliminada');
            onChanged?.();
        } catch {
            message.error('No se pudo eliminar la institución');
        }
    };

    const handleDragEnd = async ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const from = instituciones.findIndex((i) => i.id === active.id);
        const to = instituciones.findIndex((i) => i.id === over.id);
        if (from < 0 || to < 0) return;
        try {
            await reorderInstituciones(arrayMove(instituciones, from, to).map((i) => i.id));
            onChanged?.();
        } catch {
            message.error('No se pudo guardar el nuevo orden');
        }
    };

    const contarCapas = (id) => capas.filter((c) => c.institucionId === id).length;

    const columns = [
        { title: '', key: 'sort', width: 40, render: () => <DragHandleCell /> },
        {
            title: 'Logo',
            key: 'logo',
            width: 110,
            render: (_, institucion) => (
                <InstitucionLogoCell
                    institucion={institucion}
                    onSave={(id, logoUrl) => handleSave(id, { logoUrl })}
                />
            ),
        },
        {
            title: 'Nombre',
            key: 'nombre',
            render: (_, institucion) => (
                <EditableText
                    value={institucion.nombre}
                    onSave={(nombre) => handleSave(institucion.id, { nombre })}
                />
            ),
        },
        {
            title: 'Slug',
            key: 'slug',
            width: 220,
            render: (_, institucion) => (
                <EditableText
                    code
                    value={institucion.slug}
                    onSave={(slug) => handleSave(institucion.id, { slug })}
                />
            ),
        },
        {
            title: 'Capas',
            key: 'capas',
            width: 90,
            render: (_, institucion) => contarCapas(institucion.id),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 90,
            render: (_, institucion) => (
                <Popconfirm
                    title="¿Eliminar la institución?"
                    description="Sus capas quedan sin institución, no se borran."
                    okText="Eliminar"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDelete(institucion)}
                >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    return (
        <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                Agrupan las capas por dependencia. El slug alimenta la URL pública
                <code style={{ margin: '0 4px' }}>/catalogo/&lt;slug&gt;</code>
                y no puede repetirse con el de una capa. Arrastra el handle (≡) para cambiar el
                orden de las pills en el catálogo. El logo es opcional y sólo se ve en la lista
                desplegable de instituciones del visor.
            </Text>

            <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
                <Form.Item
                    name="nombre"
                    rules={[{ required: true, message: 'Nombre requerido' }]}
                    style={{ marginBottom: 8 }}
                >
                    <Input
                        placeholder="Nombre de la institución"
                        style={{ width: 260 }}
                        onChange={(e) => {
                            if (slugTocadoRef.current) return;
                            form.setFieldValue('slug', slugify(e.target.value));
                        }}
                    />
                </Form.Item>
                <Form.Item
                    name="slug"
                    style={{ marginBottom: 8 }}
                    rules={[{
                        validator: (_, v) => (!v || /^[a-z0-9-]+$/.test(v)
                            ? Promise.resolve()
                            : Promise.reject(new Error('Solo minúsculas, números y guiones'))),
                    }]}
                >
                    <Input
                        placeholder="Slug (se genera del nombre)"
                        style={{ width: 220 }}
                        onChange={() => { slugTocadoRef.current = true; }}
                    />
                </Form.Item>
                <Form.Item style={{ marginBottom: 8 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} loading={creating}>
                        Agregar
                    </Button>
                </Form.Item>
            </Form>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={instituciones.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <Table
                        rowKey="id"
                        size="small"
                        columns={columns}
                        dataSource={instituciones}
                        pagination={false}
                        components={TABLE_COMPONENTS}
                        locale={{ emptyText: 'Sin instituciones todavía' }}
                    />
                </SortableContext>
            </DndContext>

            <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
                Las capas sin institución solo aparecen en la pill «Todas» del catálogo.
            </Text>
        </>
    );
};

export default InstitucionesPanel;
