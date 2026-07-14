import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Popconfirm, Space, Table, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { catalogosApi } from '../../services/formulariosAdminApi';
import { invalidateCatalogos } from '../../hooks/useCatalogos';

const errorDetail = (err, fallback) => err?.response?.data?.detail || fallback;

export default function CatalogoItems({ clave, onChange }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [nuevo, setNuevo] = useState('');
    const [editandoId, setEditandoId] = useState(null);
    const [editValue, setEditValue] = useState('');

    const cargar = useCallback(() => {
        setLoading(true);
        catalogosApi.items(clave)
            .then(setItems)
            .catch((err) => message.error(errorDetail(err, 'Error al cargar opciones')))
            .finally(() => setLoading(false));
    }, [clave]);

    useEffect(() => { cargar(); }, [cargar]);

    const refrescar = () => {
        cargar();
        invalidateCatalogos();
        onChange?.();
    };

    const handleCrear = async () => {
        const value = nuevo.trim();
        if (!value) return;
        try {
            await catalogosApi.crear(clave, value);
            message.success(`Se agregó «${value}»`);
            setNuevo('');
            refrescar();
        } catch (err) {
            message.error(errorDetail(err, 'No se pudo agregar la opción'));
        }
    };

    const handleRenombrar = async (item) => {
        const value = editValue.trim();
        if (!value || value === item.value) {
            setEditandoId(null);
            return;
        }
        try {
            const actualizado = await catalogosApi.renombrar(clave, item.id, value);
            message.success(actualizado.en_uso
                ? `Renombrada y actualizada en ${actualizado.en_uso} envío(s)`
                : 'Opción renombrada');
            setEditandoId(null);
            refrescar();
        } catch (err) {
            message.error(errorDetail(err, 'No se pudo renombrar la opción'));
        }
    };

    const handleEliminar = async (item) => {
        try {
            await catalogosApi.eliminar(clave, item.id);
            message.success(`Se eliminó «${item.value}»`);
            refrescar();
        } catch (err) {
            message.error(errorDetail(err, 'No se pudo eliminar la opción'));
        }
    };

    const columns = [
        {
            title: 'Opción',
            dataIndex: 'value',
            render: (value, item) => (editandoId === item.id ? (
                <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onPressEnter={() => handleRenombrar(item)}
                    onBlur={() => handleRenombrar(item)}
                />
            ) : value),
        },
        {
            title: 'Uso',
            dataIndex: 'en_uso',
            width: 130,
            render: (enUso) => (enUso
                ? <Tag color="orange">{enUso} envío(s)</Tag>
                : <Tag>Sin uso</Tag>),
        },
        {
            title: '',
            width: 90,
            render: (_, item) => (
                <Space size={4}>
                    <Tooltip title="Renombrar">
                        <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => {
                                setEditandoId(item.id);
                                setEditValue(item.value);
                            }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title={item.en_uso
                            ? `No se puede borrar: la eligieron en ${item.en_uso} envío(s)`
                            : `¿Eliminar «${item.value}»?`}
                        okButtonProps={{ disabled: !!item.en_uso, danger: true }}
                        onConfirm={() => handleEliminar(item)}
                    >
                        <Tooltip title={item.en_uso ? 'En uso, no se puede borrar' : 'Eliminar'}>
                            <Button
                                type="text"
                                size="small"
                                danger
                                disabled={!!item.en_uso}
                                icon={<DeleteOutlined />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <Space.Compact block style={{ marginBottom: 12 }}>
                <Input
                    placeholder="Nueva opción (ej. Otro)"
                    value={nuevo}
                    onChange={(e) => setNuevo(e.target.value)}
                    onPressEnter={handleCrear}
                />
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCrear}
                    disabled={!nuevo.trim()}
                >
                    Agregar
                </Button>
            </Space.Compact>

            <Table
                size="small"
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={items}
                pagination={false}
                locale={{ emptyText: 'Este catálogo aún no tiene opciones' }}
            />
        </>
    );
}
