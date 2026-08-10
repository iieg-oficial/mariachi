import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

import CamaraModal from '../components/CamaraModal';
import EstadoPanel from '../components/EstadoPanel';
import {
    aplicar,
    createCamara,
    deleteCamara,
    getEstado,
    listCamaras,
    updateCamara,
} from '../api/wachaService';

const { Title, Paragraph } = Typography;

const WachaPage = () => {
    const [camaras, setCamaras] = useState([]);
    const [estado, setEstado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [aplicando, setAplicando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [enEdicion, setEnEdicion] = useState(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const [lista, situacion] = await Promise.all([listCamaras(), getEstado()]);
            setCamaras(lista);
            setEstado(situacion);
        } catch {
            message.error('No se pudieron cargar las cámaras');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const abrirNueva = () => {
        setEnEdicion(null);
        setModalAbierto(true);
    };

    const abrirEdicion = (camara) => {
        setEnEdicion(camara);
        setModalAbierto(true);
    };

    const guardar = async (valores) => {
        setGuardando(true);
        try {
            if (enEdicion) {
                await updateCamara(enEdicion.id, valores);
                message.success('Cámara actualizada');
            } else {
                await createCamara(valores);
                message.success('Cámara creada');
            }
            setModalAbierto(false);
            await cargar();
        } catch (error) {
            message.error(error?.response?.data?.detail || 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (camara) => {
        try {
            await deleteCamara(camara.id);
            message.success('Cámara eliminada');
            await cargar();
        } catch {
            message.error('No se pudo eliminar');
        }
    };

    const aplicarEnWacha = async () => {
        setAplicando(true);
        try {
            await aplicar();
            message.success('Configuración aplicada; wacha se está reiniciando');
            await cargar();
        } catch (error) {
            message.error(error?.response?.data?.detail || 'No se pudo aplicar');
        } finally {
            setAplicando(false);
        }
    };

    const columnas = [
        {
            title: 'Nombre',
            dataIndex: 'etiqueta',
            render: (valor, fila) => (
                <Space direction="vertical" size={0}>
                    <strong>{valor}</strong>
                    <Typography.Text type="secondary" code>{fila.nombre}</Typography.Text>
                </Space>
            ),
        },
        { title: 'Ubicación', dataIndex: 'ubicacion', responsive: ['md'] },
        {
            title: 'Estado',
            dataIndex: 'habilitada',
            render: (valor) => (valor
                ? <Tag color="green">habilitada</Tag>
                : <Tag>apagada</Tag>),
        },
        {
            title: 'Grabación',
            dataIndex: 'grabacion_habilitada',
            render: (valor, fila) => (valor
                ? <Tag color="blue">{fila.retencion_dias} días</Tag>
                : <Tag>sin grabar</Tag>),
        },
        {
            title: 'Detección',
            dataIndex: 'deteccion_habilitada',
            responsive: ['lg'],
            render: (valor) => (valor ? <Tag color="purple">activa</Tag> : <Tag>apagada</Tag>),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            render: (_, fila) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => abrirEdicion(fila)}>
                        Editar
                    </Button>
                    <Popconfirm
                        title="Eliminar cámara"
                        description="Deja de administrarse desde mariachi. ¿Continuar?"
                        okText="Eliminar"
                        cancelText="Cancelar"
                        onConfirm={() => eliminar(fila)}
                    >
                        <Button size="small" danger icon={<DeleteOutlined />}>Eliminar</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Cámaras</Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Catálogo de cámaras de videovigilancia. Lo que se guarda aquí es la fuente de
                    verdad; wacha lo toma al aplicar.
                </Paragraph>
            </div>

            <EstadoPanel
                estado={estado}
                cargando={cargando}
                aplicando={aplicando}
                onRecargar={cargar}
                onAplicar={aplicarEnWacha}
            />

            <Card
                title={`${camaras.length} cámara(s)`}
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={abrirNueva}>
                        Nueva cámara
                    </Button>
                }
            >
                <Table
                    rowKey="id"
                    columns={columnas}
                    dataSource={camaras}
                    loading={cargando}
                    pagination={false}
                    size="small"
                />
            </Card>

            <CamaraModal
                abierto={modalAbierto}
                camara={enEdicion}
                guardando={guardando}
                onCancelar={() => setModalAbierto(false)}
                onGuardar={guardar}
            />
        </Space>
    );
};

export default WachaPage;
