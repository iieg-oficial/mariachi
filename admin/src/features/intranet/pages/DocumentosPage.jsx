import { useMemo, useState } from 'react';
import { Button, Col, Dropdown, Popconfirm, Row, Space, Typography } from 'antd';
import {
    DeleteOutlined, DownOutlined, EditOutlined, FileTextOutlined, FolderOutlined, PlusOutlined,
} from '@ant-design/icons';
import PageHeading from '@shared/components/PageHeading';
import { useAuth } from '@shared/contexts/useAuth';

import FormularioModal from '../components/FormularioModal';
import TablaOrdenable from '../components/TablaOrdenable';
import { aFormData } from '../api/intranetService';
import { AYUDA_PUBLICO, DOCUMENTOS } from '../constants/campos';
import { useRecurso } from '../hooks/useRecurso';

const { Title } = Typography;
const PERMISO = 'mariachi.intranet.manage';
const SUELTOS = 'sueltos';

const enMegas = (bytes) => `${(bytes / (1024 * 1024)).toLocaleString('es-MX', { maximumFractionDigits: 1 })} MB`;

const CAMPOS_CARPETA = [
    { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, maximo: 100 },
    { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'texto-largo', maximo: 300 },
];

const ORDEN_CARPETAS = {
    campo: 'orden',
    aPayload: (carpeta, valor) => ({ nombre: carpeta.nombre, descripcion: carpeta.descripcion ?? null, orden: valor }),
};

const ORDEN_DOCUMENTOS = { campo: 'order', aPayload: (_, valor) => aFormData({ order: valor }) };

const camposDocumento = (carpetas, edicion) => [
    { nombre: 'title', etiqueta: 'Título', requerido: true, maximo: 150 },
    {
        nombre: 'carpeta_id', etiqueta: 'Carpeta', tipo: 'opciones',
        opciones: carpetas.map((c) => ({ value: c.id, label: c.nombre })),
        ayuda: 'Vacía deja el documento suelto, fuera de las carpetas.',
    },
    ...(edicion ? [] : [{
        nombre: 'file', etiqueta: 'Archivo', tipo: 'archivo', requerido: true,
        acepta: DOCUMENTOS, ayuda: AYUDA_PUBLICO,
    }]),
];

const aPayloadDocumento = (valores, edicion) => {
    const datos = aFormData(valores);
    if (edicion && (valores.carpeta_id === undefined || valores.carpeta_id === null)) datos.append('sin_carpeta', 'true');
    return datos;
};

const Acciones = ({ fila, que, onEditar, onBorrar }) => (
    <Space size={4}>
        <Button type="text" icon={<EditOutlined />} aria-label={`Editar ${que}`} onClick={() => onEditar(fila)} />
        <Popconfirm
            title={`¿Eliminar ${que}?`}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={() => onBorrar(fila.id)}
        >
            <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Eliminar ${que}`} />
        </Popconfirm>
    </Space>
);

const DocumentosPage = () => {
    const { can } = useAuth();
    const puedeGestionar = can(PERMISO);
    const carpetas = useRecurso('carpetas', { singular: 'Carpeta' });
    const documentos = useRecurso('documentos', { singular: 'Documento' });
    const [abierta, setAbierta] = useState(null);
    const [modal, setModal] = useState(null);

    const recargar = async () => {
        await Promise.all([carpetas.cargar(), documentos.cargar()]);
    };
    const existe = (id) => carpetas.filas.some((c) => c.id === id);
    const elegida = abierta === SUELTOS || existe(abierta) ? abierta : carpetas.filas[0]?.id ?? SUELTOS;
    const sueltos = documentos.filas.filter((d) => !existe(d.carpeta_id));
    const dentro = elegida === SUELTOS ? sueltos : documentos.filas.filter((d) => d.carpeta_id === elegida);
    const nombre = elegida === SUELTOS ? 'Sin carpeta' : carpetas.filas.find((c) => c.id === elegida)?.nombre;
    const cuantos = useMemo(() => documentos.filas.reduce((mapa, d) => ({ ...mapa, [d.carpeta_id]: (mapa[d.carpeta_id] ?? 0) + 1 }), {}), [documentos.filas]);

    const guardar = async (valores) => {
        const { tipo, fila } = modal;
        const ok = tipo === 'carpeta'
            ? await carpetas.guardar({ ...valores, orden: fila?.orden ?? 0 }, fila?.id)
            : await documentos.guardar(aPayloadDocumento(valores, Boolean(fila)), fila?.id);
        if (ok) {
            setModal(null);
            await recargar();
        }
    };
    const borrar = (recurso) => async (id) => {
        await recurso.borrar(id);
        await recargar();
    };

    const columnasCarpetas = [
        {
            title: 'Carpeta', dataIndex: 'nombre',
            render: (texto) => <Space><FolderOutlined />{texto}</Space>,
        },
        { title: 'Archivos', key: 'archivos', width: 90, render: (_, c) => cuantos[c.id] ?? 0 },
        ...(puedeGestionar ? [{
            title: '', key: 'acciones', width: 96,
            render: (_, fila) => <Acciones fila={fila} que="la carpeta" onEditar={(f) => setModal({ tipo: 'carpeta', fila: f })} onBorrar={borrar(carpetas)} />,
        }] : []),
    ];
    const columnasDocumentos = [
        { title: 'Título', dataIndex: 'title', render: (texto) => <Space><FileTextOutlined />{texto}</Space> },
        { title: 'Archivo', dataIndex: 'file_name' },
        { title: 'Tamaño', dataIndex: 'file_size', width: 100, render: enMegas },
        ...(puedeGestionar ? [{
            title: '', key: 'acciones', width: 96,
            render: (_, fila) => <Acciones fila={fila} que="el documento" onEditar={(f) => setModal({ tipo: 'documento', fila: f })} onBorrar={borrar(documentos)} />,
        }] : []),
    ];

    const agregar = {
        items: [
            { key: 'documento', icon: <FileTextOutlined />, label: 'Archivo' },
            { key: 'carpeta', icon: <FolderOutlined />, label: 'Carpeta' },
        ],
        onClick: ({ key }) => setModal({ tipo: key, fila: null }),
    };
    const inicialDocumento = modal?.fila ?? { carpeta_id: elegida === SUELTOS ? undefined : elegida };

    return (
        <>
            <PageHeading
                icon={<FileTextOutlined />}
                title="Documentos"
                description="Carpetas y archivos que cualquier persona del instituto puede descargar. Hasta 20 MB por archivo; borrar una carpeta deja sus archivos sueltos."
                extra={puedeGestionar && (
                    <Dropdown menu={agregar} trigger={['click']}>
                        <Button type="primary" icon={<PlusOutlined />}>Agregar <DownOutlined /></Button>
                    </Dropdown>
                )}
            />
            <Row gutter={[24, 24]}>
                <Col xs={24} lg={9}>
                    <TablaOrdenable
                        recurso="carpetas"
                        ordenable={puedeGestionar ? ORDEN_CARPETAS : null}
                        filas={carpetas.filas}
                        recargar={recargar}
                        cargando={carpetas.cargando}
                        vacio="Todavía no hay carpetas"
                        columnas={columnasCarpetas}
                        rowClassName={(fila) => (fila.id === elegida ? 'ant-table-row-selected' : '')}
                        onRow={(fila) => ({ onClick: () => setAbierta(fila.id), style: { cursor: 'pointer' } })}
                    />
                    <Button
                        type={elegida === SUELTOS ? 'primary' : 'default'}
                        ghost={elegida === SUELTOS}
                        block
                        icon={<FileTextOutlined />}
                        onClick={() => setAbierta(SUELTOS)}
                        style={{ marginTop: 12 }}
                    >
                        Sin carpeta · {sueltos.length}
                    </Button>
                </Col>
                <Col xs={24} lg={15}>
                    <Title level={5} style={{ marginTop: 0 }}>{nombre} · {dentro.length} {dentro.length === 1 ? 'archivo' : 'archivos'}</Title>
                    <TablaOrdenable
                        key={elegida}
                        recurso="documentos"
                        ordenable={puedeGestionar ? ORDEN_DOCUMENTOS : null}
                        filas={dentro}
                        recargar={recargar}
                        cargando={documentos.cargando}
                        vacio="No hay archivos aquí"
                        columnas={columnasDocumentos}
                    />
                </Col>
            </Row>
            <FormularioModal
                abierto={Boolean(modal)}
                titulo={modal?.fila ? `Editar ${modal.tipo === 'carpeta' ? 'carpeta' : 'documento'}` : modal?.tipo === 'carpeta' ? 'Nueva carpeta' : 'Nuevo archivo'}
                campos={modal?.tipo === 'carpeta' ? CAMPOS_CARPETA : camposDocumento(carpetas.filas, Boolean(modal?.fila))}
                inicial={modal?.tipo === 'carpeta' ? modal?.fila : inicialDocumento}
                guardando={carpetas.guardando || documentos.guardando}
                onCancelar={() => setModal(null)}
                onGuardar={guardar}
            />
        </>
    );
};

export default DocumentosPage;
