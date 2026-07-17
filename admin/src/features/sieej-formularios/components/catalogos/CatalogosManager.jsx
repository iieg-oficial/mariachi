import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Button,
    Input,
    Popconfirm,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import { CloseOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { catalogosApi } from '../../services/formulariosAdminApi';
import { invalidateCatalogos } from '../../hooks/useCatalogos';
import CatalogoItems from './CatalogoItems';

const errorDetail = (err, fallback) => err?.response?.data?.detail || fallback;

const slugify = (label) => label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);

const agruparPorFormulario = (campos) => {
    const grupos = new Map();
    campos.forEach((c) => {
        const grupo = grupos.get(c.formulario_id)
            ?? { id: c.formulario_id, formulario: c.formulario, campos: [] };
        grupo.campos.push(c);
        grupos.set(c.formulario_id, grupo);
    });
    return [...grupos.values()];
};

export default function CatalogosManager({ clave: claveInicial }) {
    const [catalogos, setCatalogos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(claveInicial ? [claveInicial] : []);
    const [adding, setAdding] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [editingClave, setEditingClave] = useState(null);
    const [editLabel, setEditLabel] = useState('');
    const newLabelRef = useRef(null);

    useEffect(() => {
        if (adding) newLabelRef.current?.focus();
    }, [adding]);

    const cargar = useCallback(() => {
        setLoading(true);
        catalogosApi.listar()
            .then(setCatalogos)
            .catch((err) => message.error(errorDetail(err, 'Error al cargar catálogos')))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    useEffect(() => {
        if (claveInicial) setExpanded([claveInicial]);
    }, [claveInicial]);

    const cancelCreate = () => {
        setAdding(false);
        setNewLabel('');
    };

    const handleCreate = async () => {
        const label = newLabel.trim();
        if (!label) return;
        setCreating(true);
        try {
            const creado = await catalogosApi.createCatalog(label);
            message.success(`Catálogo «${creado.label}» creado`);
            setAdding(false);
            setNewLabel('');
            setExpanded([creado.clave]);
            invalidateCatalogos();
            cargar();
        } catch (err) {
            message.error(errorDetail(err, 'No se pudo crear el catálogo'));
        } finally {
            setCreating(false);
        }
    };

    const handleRename = async (catalogo) => {
        const label = editLabel.trim();
        if (!label || label === catalogo.label) {
            setEditingClave(null);
            return;
        }
        try {
            await catalogosApi.updateCatalog(catalogo.clave, label);
            message.success('Catálogo renombrado');
            setEditingClave(null);
            cargar();
        } catch (err) {
            message.error(errorDetail(err, 'No se pudo renombrar el catálogo'));
        }
    };

    const handleDelete = async (catalogo) => {
        try {
            await catalogosApi.deleteCatalog(catalogo.clave);
            message.success(`Catálogo «${catalogo.label}» eliminado`);
            invalidateCatalogos();
            cargar();
        } catch (err) {
            message.error(errorDetail(err, 'No se pudo eliminar el catálogo'));
        }
    };

    const columns = [
        {
            title: 'Catálogo',
            dataIndex: 'label',
            render: (label, c) => (
                <div>
                    {editingClave === c.clave ? (
                        <Input
                            size="small"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onPressEnter={() => handleRename(c)}
                            onBlur={() => handleRename(c)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div style={{ fontWeight: 500 }}>{label}</div>
                    )}
                    <Typography.Text type="secondary" style={{ fontSize: 12 }} copyable>
                        {c.clave}
                    </Typography.Text>
                </div>
            ),
        },
        {
            title: 'Opciones',
            dataIndex: 'total',
            width: 110,
            align: 'center',
            render: (total) => (total
                ? <Tag color="blue">{total}</Tag>
                : <Tag color="red">Vacío</Tag>),
        },
        {
            title: 'Campos enlazados',
            dataIndex: 'campos',
            render: (campos = []) => {
                if (campos.length === 0) {
                    return (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            Ningún campo lo usa
                        </Typography.Text>
                    );
                }
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {agruparPorFormulario(campos).map(({ id, formulario, campos: lista }) => (
                            <div key={id}>
                                <Typography.Text
                                    type="secondary"
                                    style={{ fontSize: 12, display: 'block' }}
                                >
                                    {formulario}
                                </Typography.Text>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 4,
                                    marginTop: 2,
                                }}>
                                    {lista.map((c) => (
                                        <Tooltip
                                            key={`${c.step_id}-${c.field_name}`}
                                            title={`Paso: ${c.step_id} · campo: ${c.field_name}`}
                                        >
                                            <Tag style={{ margin: 0 }}>
                                                {c.field_label || c.field_name}
                                            </Tag>
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            },
        },
        {
            title: '',
            width: 90,
            render: (_, c) => {
                const enlazado = (c.campos ?? []).length > 0;
                return (
                    <Space size={4}>
                        <Tooltip title="Renombrar catálogo">
                            <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                    setEditingClave(c.clave);
                                    setEditLabel(c.label);
                                }}
                            />
                        </Tooltip>
                        <Popconfirm
                            title={enlazado
                                ? 'No se puede eliminar: hay campos enlazados a este catálogo'
                                : `¿Eliminar el catálogo «${c.label}» y sus opciones?`}
                            okButtonProps={{ disabled: enlazado, danger: true }}
                            onConfirm={() => handleDelete(c)}
                        >
                            <Tooltip
                                title={enlazado
                                    ? 'En uso por campos, no se puede eliminar'
                                    : 'Eliminar catálogo'}
                            >
                                <Button
                                    type="text"
                                    size="small"
                                    danger
                                    disabled={enlazado}
                                    icon={<DeleteOutlined />}
                                />
                            </Tooltip>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    const claveDerivada = slugify(newLabel.trim());

    return (
        <>
            <div style={{ marginBottom: 12 }}>
                {adding ? (
                    <>
                        <Space.Compact block>
                            <Input
                                ref={newLabelRef}
                                placeholder="Nuevo catálogo (ej. Municipios de Jalisco)"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                onPressEnter={handleCreate}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') cancelCreate();
                                }}
                            />
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleCreate}
                                loading={creating}
                                disabled={!newLabel.trim()}
                            >
                                Crear
                            </Button>
                            <Tooltip title="Cancelar">
                                <Button
                                    aria-label="Cancelar"
                                    icon={<CloseOutlined />}
                                    onClick={cancelCreate}
                                />
                            </Tooltip>
                        </Space.Compact>
                        {claveDerivada && (
                            <Typography.Text
                                type="secondary"
                                style={{ fontSize: 12, display: 'block', marginTop: 4 }}
                            >
                                Clave: <Typography.Text code>{claveDerivada}</Typography.Text>
                            </Typography.Text>
                        )}
                    </>
                ) : (
                    <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => setAdding(true)}
                    >
                        Nuevo catálogo
                    </Button>
                )}
            </div>

            <Table
                size="small"
                rowKey="clave"
                loading={loading}
                columns={columns}
                dataSource={catalogos}
                pagination={false}
                expandable={{
                    expandedRowKeys: expanded,
                    onExpandedRowsChange: (keys) => setExpanded([...keys]),
                    expandedRowRender: (c) => (
                        <CatalogoItems clave={c.clave} onChange={cargar} />
                    ),
                }}
            />

        </>
    );
}
