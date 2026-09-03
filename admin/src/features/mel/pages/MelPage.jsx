import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Layout, Segmented, Spin, Tag, Typography } from 'antd';
import { BgColorsOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { downloadExport, getMarca, listMarcas } from '@features/mel/api/melService';
import ColoresPanel from '@features/mel/components/ColoresPanel';
import GruposPanel from '@features/mel/components/GruposPanel';
import VistaPrevia from '@features/mel/components/VistaPrevia';
import BarraCambios from '@features/mel/components/BarraCambios';
import DiffDrawer from '@features/mel/components/DiffDrawer';
import { SECCIONES } from '@features/mel/constants/campos';
import { esHex, evaluarToken } from '@features/mel/helpers/contraste';
import useCambiosMel from '@features/mel/hooks/useCambiosMel';
import PageHeading from '@shared/components/PageHeading';
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
    const [superficie, setSuperficie] = useState('panel');
    const [grupoAbierto, setGrupoAbierto] = useState(null);
    const [diffAbierto, setDiffAbierto] = useState(false);
    const [busqueda, setBusqueda] = useState('');

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

    useEffect(() => {
        if (colores.length && !colores.some((token) => token.id === seleccion)) {
            setSeleccion(colores[0].id);
        }
    }, [colores, seleccion]);

    const valorDeClave = useCallback((clave, respaldo) => {
        const token = colores.find((item) => item.clave === clave);
        const valor = token ? cambios.valorDeToken(token) : null;
        return esHex(valor) ? valor : respaldo;
    }, [colores, cambios]);

    const fondo = useMemo(() => valorDeClave('color.bg', FONDO_POR_DEFECTO), [valorDeClave]);
    const colorTexto = useMemo(() => valorDeClave('color.text', TEXTO_POR_DEFECTO), [valorDeClave]);

    const activo = colores.find((token) => token.id === seleccion);
    const colorActivo = activo ? cambios.valorDeToken(activo) : null;

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
                title='MEL · Manual de Estilo y Lineamientos'
                description='Los valores de cada marca. La descarga trae la guía, los tokens y los CSS.'
                extra={(
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Segmented
                            options={marcas.map((marca) => ({ value: marca.codigo, label: marca.nombre }))}
                            value={codigo}
                            onChange={setCodigo}
                        />
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
                        <div
                            style={{
                                width: 620,
                                flexShrink: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                background: '#fff',
                                borderRight: '1px solid rgba(5,5,5,0.06)',
                                minHeight: 0,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '12px 16px',
                                    borderBottom: '1px solid rgba(5,5,5,0.06)',
                                }}
                            >
                                <Input
                                    prefix={<SearchOutlined />}
                                    placeholder='Buscar token de color…'
                                    value={busqueda}
                                    onChange={(evento) => setBusqueda(evento.target.value)}
                                    allowClear
                                />
                                <Text type='secondary' style={{ whiteSpace: 'nowrap' }}>
                                    {(detalle?.tokens || []).length} tokens · {totalCampos} campos
                                </Text>
                            </div>

                            <div style={{ flexGrow: 1, padding: 16, overflow: 'auto', minHeight: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <Text strong>Color</Text>
                                    <Tag>{colores.length}</Tag>
                                    <span style={{ flexGrow: 1 }} />
                                    <Text
                                        style={{ fontSize: 12, color: noAlcanzan > 0 ? '#d4380d' : '#1F7A4D' }}
                                    >
                                        {noAlcanzan > 0 ? `${noAlcanzan} no alcanza AA` : 'todos cumplen AA'}
                                    </Text>
                                </div>

                                <ColoresPanel
                                    tokens={filtrados}
                                    fondo={fondo}
                                    colorTexto={colorTexto}
                                    seleccion={seleccion}
                                    onSeleccionar={setSeleccion}
                                    valorDeToken={cambios.valorDeToken}
                                    onCambiar={cambios.cambiarToken}
                                />

                                <GruposPanel
                                    tokens={detalle?.tokens || []}
                                    campos={detalle?.campos || {}}
                                    abierto={grupoAbierto}
                                    onAbrir={setGrupoAbierto}
                                    valorDeToken={cambios.valorDeToken}
                                    onCambiarToken={cambios.cambiarToken}
                                    valorDeCampo={cambios.valorDeCampo}
                                    onCambiarCampo={cambios.cambiarCampo}
                                    sinDefinir={sinDefinir}
                                />
                            </div>
                        </div>

                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                            <VistaPrevia
                                superficie={superficie}
                                onSuperficie={setSuperficie}
                                codigo={codigo}
                                color={colorActivo}
                                hayPendientes={cambios.total > 0}
                            />
                        </div>
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
