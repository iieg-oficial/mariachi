import { useState } from 'react';
import { Button, Popconfirm, Space } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import PageHeading from '@shared/components/PageHeading';
import { useAuth } from '@shared/contexts/useAuth';

import FormularioModal from './FormularioModal';
import TablaOrdenable from './TablaOrdenable';
import { useRecurso } from '../hooks/useRecurso';

const PERMISO = 'mariachi.intranet.manage';

const PaginaRecurso = ({ definicion, acciones, extra, level }) => {
    const { can } = useAuth();
    const puedeGestionar = can(PERMISO);
    const { filas, cargando, guardando, cargar, guardar, borrar } = useRecurso(
        definicion.recurso,
        { singular: definicion.singular },
    );
    const [abierto, setAbierto] = useState(false);
    const [enEdicion, setEnEdicion] = useState(null);
    const ordenable = puedeGestionar ? definicion.ordenable : null;

    const abrir = (fila = null) => {
        setEnEdicion(fila);
        setAbierto(true);
    };

    const alGuardar = async (valores) => {
        const payload = definicion.aPayload ? definicion.aPayload(valores, { edicion: Boolean(enEdicion) }) : valores;
        if (await guardar(payload, enEdicion?.id)) setAbierto(false);
    };

    const columnaAcciones = {
        title: 'Acciones',
        key: 'acciones',
        width: 160,
        render: (_, fila) => (
            <Space size={4}>
                {acciones?.(fila, cargar)}
                {definicion.editable !== false && (
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        aria-label={`Editar ${definicion.singular.toLowerCase()}`}
                        onClick={() => abrir(fila)}
                    />
                )}
                <Popconfirm
                    title={`¿Eliminar ${definicion.singular.toLowerCase()}?`}
                    okText="Eliminar"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => borrar(fila.id)}
                >
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`Eliminar ${definicion.singular.toLowerCase()}`}
                    />
                </Popconfirm>
            </Space>
        ),
    };

    const campos = enEdicion && definicion.camposEdicion
        ? definicion.camposEdicion
        : definicion.campos;

    return (
        <>
            <PageHeading
                icon={definicion.icono}
                title={definicion.titulo}
                description={definicion.descripcion}
                level={level}
                extra={
                    <Space size={12}>
                        {extra}
                        {puedeGestionar && definicion.alta && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => abrir()}>
                                {definicion.alta}
                            </Button>
                        )}
                    </Space>
                }
            />
            <TablaOrdenable
                recurso={definicion.recurso}
                ordenable={ordenable}
                filas={filas}
                recargar={cargar}
                cargando={cargando}
                vacio={definicion.vacio}
                columnas={[...definicion.columnas, ...(puedeGestionar ? [columnaAcciones] : [])]}
            />
            <FormularioModal
                abierto={abierto}
                titulo={enEdicion ? `Editar ${definicion.singular.toLowerCase()}` : definicion.alta}
                campos={campos}
                inicial={enEdicion && definicion.aFormulario ? definicion.aFormulario(enEdicion) : enEdicion}
                guardando={guardando}
                onCancelar={() => setAbierto(false)}
                onGuardar={alGuardar}
            />
        </>
    );
};

export default PaginaRecurso;
