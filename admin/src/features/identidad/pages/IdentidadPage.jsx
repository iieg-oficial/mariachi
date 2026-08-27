import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Layout, Space, Spin, Tabs, Typography } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import {
    downloadExport,
    getArtefacto,
    getMarca,
    listMarcas,
    updateCampos,
    updateToken,
} from '@features/identidad/api/identidadService';
import CamposPanel from '@features/identidad/components/CamposPanel';
import ContrasteAlert from '@features/identidad/components/ContrasteAlert';
import TokensPanel from '@features/identidad/components/TokensPanel';
import PageHeading from '@shared/components/PageHeading';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Paragraph, Text } = Typography;

const ARTEFACTOS = ['design.md', 'theme.css', 'tokens.css', 'fonts.css'];

export default function IdentidadPage() {
    const [marcas, setMarcas] = useState([]);
    const [codigo, setCodigo] = useState(null);
    const [detalle, setDetalle] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);
    const [vista, setVista] = useState({ nombre: null, contenido: '' });

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

    useEffect(() => { recargar(); }, [recargar]);

    const guardarToken = async (token, payload) => {
        setGuardando(true);
        try {
            await updateToken(codigo, token.id, payload);
            message.success(`${token.clave} actualizado`);
            await recargar();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo guardar el token');
        } finally {
            setGuardando(false);
        }
    };

    const guardarCampos = async (valores) => {
        setGuardando(true);
        try {
            await updateCampos(codigo, valores);
            message.success('Campos actualizados');
            await recargar();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron guardar los campos');
        } finally {
            setGuardando(false);
        }
    };

    const verArtefacto = async (nombre) => {
        try {
            setVista({ nombre, contenido: await getArtefacto(codigo, nombre) });
        } catch {
            message.error(`No se pudo generar ${nombre}`);
        }
    };

    if (error && !detalle) {
        return (
            <Content style={{ padding: 24 }}>
                <Alert type='error' showIcon title={error} />
            </Content>
        );
    }

    return (
        <Content style={{ padding: 24 }}>
            <PageHeading
                title='Identidad visual'
                extra={(
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={recargar}>Recargar</Button>
                        <Button
                            type='primary'
                            icon={<DownloadOutlined />}
                            disabled={!codigo}
                            onClick={() => downloadExport(codigo)}
                        >
                            Descargar ZIP
                        </Button>
                    </Space>
                )}
            />
            <Paragraph type='secondary'>
                Los valores de cada marca se administran aquí. La descarga trae la guía en
                markdown, los tokens en formato DTCG y los CSS listos para el proyecto.
            </Paragraph>

            <Tabs
                activeKey={codigo}
                onChange={setCodigo}
                items={marcas.map((marca) => ({ key: marca.codigo, label: marca.nombre }))}
            />

            <Spin spinning={cargando}>
                {detalle && (
                    <Space orientation='vertical' size='large' style={{ width: '100%' }}>
                        <Card title='Accesibilidad del color'>
                            <ContrasteAlert contraste={detalle.contraste} />
                        </Card>

                        <Card title='Tokens'>
                            <TokensPanel
                                tokens={detalle.tokens}
                                onGuardar={guardarToken}
                                guardando={guardando}
                            />
                        </Card>

                        <Card title='Guía de marca'>
                            <CamposPanel
                                campos={detalle.campos}
                                onGuardar={guardarCampos}
                                guardando={guardando}
                            />
                        </Card>

                        <Card
                            title='Vista previa de los artefactos'
                            extra={(
                                <Space>
                                    {ARTEFACTOS.map((nombre) => (
                                        <Button key={nombre} size='small' onClick={() => verArtefacto(nombre)}>
                                            {nombre}
                                        </Button>
                                    ))}
                                </Space>
                            )}
                        >
                            {vista.nombre ? (
                                <>
                                    <Text type='secondary'>{vista.nombre}</Text>
                                    <pre style={{ maxHeight: 420, overflow: 'auto', marginTop: 8 }}>
                                        {vista.contenido}
                                    </pre>
                                </>
                            ) : (
                                <Text type='secondary'>Elige un artefacto para verlo.</Text>
                            )}
                        </Card>
                    </Space>
                )}
            </Spin>
        </Content>
    );
}
