import { useCallback, useEffect, useState } from 'react';
import { Button, Col, ConfigProvider, Empty, Row, Segmented, Space, Spin, message } from 'antd';
import {
    AppstoreOutlined,
    PlusOutlined,
    TableOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import { GridPanel } from '@shared/components/dataGrid';
import PageHeading from '@shared/components/PageHeading';
import { useAuth } from '@shared/contexts/useAuth';

import CamaraCard from '../components/CamaraCard';
import CamaraModal from '../components/CamaraModal';
import EstadoFrames from '../components/EstadoFrames';
import { TEMA_FRAMES } from '../constants/tema';
import {
    aplicar,
    createCamara,
    deleteCamara,
    getEstado,
    getEstadoCamaras,
    listCamaras,
    updateCamara,
} from '../api/framesService';

const VISTAS = [
    { label: 'Fichas', value: 'fichas', icon: <AppstoreOutlined /> },
    { label: 'Tabla', value: 'tabla', icon: <TableOutlined /> },
];

const BUSQUEDA = ['nombre', 'etiqueta', 'ubicacion', 'rtsp_url'];

const DESCRIPCION = 'Catálogo de cámaras de videovigilancia. Lo que se guarda aquí es la fuente '
    + 'de verdad; frames lo toma al aplicar.';

const FramesPage = () => {
    const { can } = useAuth();
    const puedeGestionar = can('mariachi.frames.manage');
    const [camaras, setCamaras] = useState([]);
    const [estado, setEstado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [aplicando, setAplicando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [enEdicion, setEnEdicion] = useState(null);
    const [enVivo, setEnVivo] = useState({});
    const [vista, setVista] = useState('fichas');

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const [lista, situacion] = await Promise.all([listCamaras(), getEstado()]);
            setCamaras(lista);
            setEstado(situacion);
            try {
                setEnVivo(await getEstadoCamaras());
            } catch {
                setEnVivo({});
            }
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

    const aplicarEnFrames = async () => {
        setAplicando(true);
        try {
            await aplicar();
            message.success('Configuración aplicada; frames se está reiniciando');
            await cargar();
        } catch (error) {
            message.error(error?.response?.data?.detail || 'No se pudo aplicar');
        } finally {
            setAplicando(false);
        }
    };

    return (
        <ConfigProvider theme={TEMA_FRAMES}>
            <PageHeading
                icon={<VideoCameraOutlined />}
                title="Cámaras"
                description={DESCRIPCION}
                extra={
                    <Space size={12}>
                        <Segmented options={VISTAS} value={vista} onChange={setVista} />
                        {puedeGestionar && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNueva}>
                                Nueva cámara
                            </Button>
                        )}
                    </Space>
                }
            />

            <EstadoFrames
                estado={estado}
                cargando={cargando}
                aplicando={aplicando}
                onRecargar={cargar}
                onAplicar={aplicarEnFrames}
                puedeGestionar={puedeGestionar}
            />

            {vista === 'fichas' ? (
                <Spin spinning={cargando}>
                    {camaras.length === 0 ? (
                        <Empty description="Todavía no hay cámaras en el catálogo" />
                    ) : (
                        <Row gutter={[16, 16]}>
                            {camaras.map((camara) => (
                                <Col key={camara.id} xs={24} sm={12} xl={8}>
                                    <CamaraCard
                                        camara={camara}
                                        vivo={enVivo[camara.nombre]}
                                        onEditar={abrirEdicion}
                                        onEliminar={eliminar}
                                        puedeGestionar={puedeGestionar}
                                    />
                                </Col>
                            ))}
                        </Row>
                    )}
                </Spin>
            ) : (
                <div style={{ height: '60vh' }}>
                    <GridPanel
                        resource="frames-camaras"
                        rowKeyField="nombre"
                        searchFields={BUSQUEDA}
                        searchPlaceholder="Buscar por nombre, ubicación o URL"
                        itemsLabel="cámaras"
                        exportFileName="camaras-frames"
                        rowLabelField="etiqueta"
                        active={vista === 'tabla'}
                    />
                </div>
            )}

            <CamaraModal
                abierto={modalAbierto}
                camara={enEdicion}
                guardando={guardando}
                onCancelar={() => setModalAbierto(false)}
                onGuardar={guardar}
            />
        </ConfigProvider>
    );
};

export default FramesPage;
