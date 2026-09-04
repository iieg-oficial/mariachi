import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Layout, Segmented, Spin, Tag, Typography } from 'antd';
import { BgColorsOutlined, DownloadOutlined, FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import { downloadExport, getMarca, listMarcas } from '@features/mel/api/melService';
import PanelControles from '@features/mel/components/PanelControles';
import EditorToken from '@features/mel/components/EditorToken';
import VistaPrevia from '@features/mel/components/VistaPrevia';
import BarraCambios from '@features/mel/components/BarraCambios';
import DiffDrawer from '@features/mel/components/DiffDrawer';
import ArtefactosDrawer from '@features/mel/components/ArtefactosDrawer';
import { SECCIONES } from '@features/mel/constants/campos';
import { esHex, evaluarToken } from '@features/mel/helpers/contraste';
import { tocaElemento } from '@features/mel/helpers/aplicacion';
import useCambiosMel from '@features/mel/hooks/useCambiosMel';
import PageHeading from '@shared/components/PageHeading';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Text } = Typography;

const FONDO_POR_DEFECTO = '#FFFFFF';
const TEXTO_POR_DEFECTO = '#000000';
const ALTO_PANELES = 'calc(100vh - 268px)';

const totalCampos = SECCIONES.reduce((suma, seccion) => suma + seccion.campos.length, 0);

export default function MelPage() {
    const [marcas, setMarcas] = useState([]);
    const [codigo, setCodigo] = useState(null);
    const [detalle, setDetalle] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [seleccion, setSeleccion] = useState(null);
    const [grupoAbierto, setGrupoAbierto] = useState(null);
    const [diffAbierto, setDiffAbierto] = useState(false);
    const [artefactosAbierto, setArtefactosAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [elemento, setElemento] = useState(null);
    const [anclado, setAnclado] = useState(null);
    const [anclaLista, setAnclaLista] = useState(null);
    const [dispositivo, setDispositivo] = useState(null);
    const { isMobile } = useIsMobile();

    const recargar = useCallback(async () => {
        if (!codigo) return;
        setCargando(true);
        try {
            setDetalle(await getMarca(codigo));
            setError(null);
        } catch (err) {
            setError(err?.response?.data?.detail || 'No se pudo cargar la marca');
        } finally {
            setCargando(false);
        }
    }, [codigo]);

    const cambios = useCambiosMel(detalle, recargar);

    useEffect(() => {
        listMarcas()
            .then((data) => {
                setMarcas(data);
                if (data.length) setCodigo(data[0].codigo);
                else setCargando(false);
            })
            .catch((err) => {
                setError(err?.response?.data?.detail || 'No se pudieron cargar las marcas');
                setCargando(false);
            });
    }, []);

    useEffect(() => { recargar(); }, [recargar]);

    const colores = useMemo(
        () => (detalle?.tokens || []).filter((token) => token.grupo === 'color'),
        [detalle],
    );

    const filtrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto) return colores;
        return colores.filter((token) => token.clave.toLowerCase().includes(texto));
    }, [colores, busqueda]);

    const todos = useMemo(() => detalle?.tokens || [], [detalle]);

    useEffect(() => {
        if (seleccion !== null && todos.length && !todos.some((token) => token.id === seleccion)) {
            setSeleccion(null);
        }
    }, [todos, seleccion]);

    const valorDeClave = useCallback((clave, respaldo) => {
        const token = colores.find((item) => item.clave === clave);
        const valor = token ? cambios.valorDeToken(token) : null;
        return esHex(valor) ? valor : respaldo;
    }, [colores, cambios]);

    const fondo = useMemo(() => valorDeClave('color.bg', FONDO_POR_DEFECTO), [valorDeClave]);
    const colorTexto = useMemo(() => valorDeClave('color.text', TEXTO_POR_DEFECTO), [valorDeClave]);

    const noAlcanzan = colores.filter((token) => {
        const juicio = evaluarToken(token.clave, cambios.valorDeToken(token), fondo, colorTexto);
        return juicio.nivel === 'falla' || juicio.nivel === 'grande';
    }).length;

    const sinDefinir = SECCIONES.reduce((suma, seccion) => (
        suma + seccion.campos.filter(([clave]) => {
            const actual = (detalle?.campos || {})[clave] || '';
            return cambios.valorDeCampo(clave, actual).trim() === '';
        }).length
    ), 0);

    const GRUPO_DE = {
        tipografia: 'tipografia',
        espaciado: 'espaciado',
        radio: 'forma',
        sombra: 'forma',
        dataviz: 'dataviz',
        breakpoint: 'breakpoints',
    };

    const alElemento = (id, fijar) => {
        if (!fijar) {
            if (!anclado) setElemento(id);
            return;
        }
        setElemento(id);
        const candidato = todos.find(
            (token) => tocaElemento(token.clave, cambios.valorDeToken(token), id),
        );
        if (!candidato) {
            setAnclado(null);
            return;
        }
        setSeleccion(candidato.id);
        setAnclado(id);
        setAnclaLista(null);
        if (candidato.grupo !== 'color') setGrupoAbierto(GRUPO_DE[candidato.grupo] || null);
    };

    const cerrarAncla = () => {
        setAnclado(null);
        setElemento(null);
    };

    const ANCHOS = { sm: 640, md: 768, lg: 1024, xl: 1280 };

    const seleccionarDeLista = (id) => {
        setSeleccion(id);
        setAnclaLista(id);
        setAnclado(null);
    };

    const tokenSeleccionado = todos.find((token) => token.id === seleccion) || null;

    const guardar = async () => {
        try {
            await cambios.guardar();
            setDiffAbierto(false);
            message.success('Cambios guardados');
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron guardar los cambios');
        }
    };

    if (error && !detalle) {
        return (
            <Content>
                <Alert type='error' showIcon message={error} />
            </Content>
        );
    }

    return (
        <Content>
            <PageHeading
                icon={<BgColorsOutlined />}
                title='MEL'
                description='Manual de Estilo y Lineamientos'
                extra={(
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Segmented
                            options={marcas.map((marca) => ({ value: marca.codigo, label: marca.nombre }))}
                            value={codigo}
                            onChange={setCodigo}
                        />
                        <Button
                            icon={<FileTextOutlined />}
                            disabled={!codigo}
                            onClick={() => setArtefactosAbierto(true)}
                        >
                            Ver artefactos
                        </Button>
                        <Button
                            type='primary'
                            icon={<DownloadOutlined />}
                            disabled={!codigo}
                            onClick={() => downloadExport(codigo)}
                        >
                            Descargar ZIP
                        </Button>
                    </div>
                )}
            />

            <Spin spinning={cargando}>
                <div
                    style={{
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: '#f5f5f5',
                    }}
                >
                    <div style={{ display: 'flex', height: ALTO_PANELES, minHeight: 520 }}>
                        <PanelControles
                            ancho={isMobile ? '100%' : 620}
                            busqueda={busqueda}
                            onBuscar={setBusqueda}
                            totalTokens={todos.length}
                            totalCampos={totalCampos}
                            colores={colores}
                            filtrados={filtrados}
                            noAlcanzan={noAlcanzan}
                            fondo={fondo}
                            colorTexto={colorTexto}
                            seleccion={seleccion}
                            onSeleccionar={seleccionarDeLista}
                            elemento={elemento}
                            ancla={anclaLista}
                            onCerrarAncla={() => setAnclaLista(null)}
                            dispositivo={dispositivo}
                            onDispositivo={setDispositivo}
                            tokens={todos}
                            campos={detalle?.campos || {}}
                            grupoAbierto={grupoAbierto}
                            onAbrirGrupo={setGrupoAbierto}
                            sinDefinir={sinDefinir}
                            cambios={cambios}
                        />

                        {!isMobile && (
                            <div style={{ flexGrow: 1, minWidth: 0 }}>
                                <VistaPrevia
                                    tokens={todos}
                                    campos={detalle?.campos || {}}
                                    seleccion={seleccion}
                                    valorDeToken={cambios.valorDeToken}
                                    onLimpiar={() => { setSeleccion(null); setDispositivo(null); }}
                                    ancho={dispositivo ? ANCHOS[dispositivo] : null}
                                    elemento={elemento}
                                    onElemento={alElemento}
                                    anclado={anclado}
                                    onCerrar={cerrarAncla}
                                    editor={(
                                        <EditorToken
                                            token={tokenSeleccionado}
                                            valor={tokenSeleccionado ? cambios.valorDeToken(tokenSeleccionado) : ''}
                                            onCambiar={cambios.cambiarToken}
                                            fondo={fondo}
                                            colorTexto={colorTexto}
                                            ancho={380}
                                        />
                                    )}
                                />
                            </div>
                        )}
                    </div>

                    <BarraCambios
                        lista={cambios.lista}
                        guardando={cambios.guardando}
                        onVerDiff={() => setDiffAbierto(true)}
                        onDescartar={cambios.descartar}
                        onGuardar={guardar}
                    />
                </div>
            </Spin>

            <ArtefactosDrawer
                abierto={artefactosAbierto}
                onCerrar={() => setArtefactosAbierto(false)}
                codigo={codigo}
                hayPendientes={cambios.total > 0}
            />

            <DiffDrawer
                abierto={diffAbierto}
                onCerrar={() => setDiffAbierto(false)}
                lista={cambios.lista}
                fondo={fondo}
                guardando={cambios.guardando}
                onGuardar={guardar}
            />
        </Content>
    );
}
