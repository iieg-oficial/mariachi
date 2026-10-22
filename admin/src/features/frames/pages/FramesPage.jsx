import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, ConfigProvider, Segmented, Space, Spin, message } from 'antd';
import {
    CloudDownloadOutlined,
    ExpandOutlined,
    PlusOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import PageHeading from '@shared/components/PageHeading';
import { useAuth } from '@shared/contexts/useAuth';

import CamaraModal from '../components/CamaraModal';
import EstadoFrames from '../components/EstadoFrames';
import ImportarNvr from '../components/ImportarNvr';
import MosaicoCamaras from '../components/MosaicoCamaras';
import { CALIDADES } from '../constants/calidades';
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

const DESCRIPCION = 'Cámaras de videovigilancia en vivo. Lo que se guarda aquí es la fuente de '
    + 'verdad; frames lo toma al aplicar. Edita o agrega desde esta misma pantalla.';

const FramesPage = () => {
    const navigate = useNavigate();
    const { can } = useAuth();
    const puedeGestionar = can('mariachi.frames.manage');
    const [camaras, setCamaras] = useState([]);
    const [estado, setEstado] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [aplicando, setAplicando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [importarAbierto, setImportarAbierto] = useState(false);
    const [enEdicion, setEnEdicion] = useState(null);
    const [enVivo, setEnVivo] = useState({});
    const [alto, setAlto] = useState(360);
    const [version, setVersion] = useState(0);

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
            setVersion((v) => v + 1);
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
                    <Space size={12} wrap>
                        <Segmented options={CALIDADES} value={alto} onChange={setAlto} />
                        <Button
                            icon={<ExpandOutlined />}
                            onClick={() => navigate('/frames/vivo/pantalla')}
                        >
                            Pantalla completa
                        </Button>
                        {puedeGestionar && (
                            <>
                                <Button
                                    icon={<CloudDownloadOutlined />}
                                    onClick={() => setImportarAbierto(true)}
                                >
                                    Importar del NVR
                                </Button>
                                <Button type="primary" icon={<PlusOutlined />} onClick={abrirNueva}>
                                    Nueva cámara
                                </Button>
                            </>
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

            <Spin spinning={cargando}>
                <MosaicoCamaras
                    camaras={camaras}
                    estados={enVivo}
                    alto={alto}
                    version={version}
                    onEditar={abrirEdicion}
                    onEliminar={eliminar}
                    puedeGestionar={puedeGestionar}
                />
            </Spin>

            <CamaraModal
                abierto={modalAbierto}
                camara={enEdicion}
                guardando={guardando}
                onCancelar={() => setModalAbierto(false)}
                onGuardar={guardar}
            />

            <ImportarNvr
                abierto={importarAbierto}
                onCerrar={() => setImportarAbierto(false)}
                onImportado={async () => {
                    setImportarAbierto(false);
                    await cargar();
                }}
            />
        </ConfigProvider>
    );
};

export default FramesPage;
