import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Card, Descriptions, Dropdown, Form, Input, Popconfirm, Space, Spin, Tag } from 'antd';
import {
    ArrowLeftOutlined, BookOutlined, ExportOutlined, PlusOutlined, SaveOutlined, SendOutlined, UndoOutlined,
} from '@ant-design/icons';
import PageHeading from '@shared/components/PageHeading';
import PresenciaIndicator from '@shared/components/PresenciaIndicator';
import usePresencia from '@shared/hooks/usePresencia';
import { useAuth } from '@shared/contexts/useAuth';
import { message } from '@shared/services/message';
import SeccionesTabla from '../components/SeccionesTabla';
import SeccionDrawer from '../components/SeccionDrawer';
import {
    descartarBorrador, guardarBorrador, obtenerPipeline, publicarPipeline, rutaPresencia,
} from '../services/documentacionApi';
import {
    CONTENIDO_VACIO, ESTADOS, PERMISO_EDITAR, PERMISO_PUBLICAR, TIPOS, errorDetalle,
} from '../constants/secciones';

const SITIO = 'https://documentacion.sieej.iieg/pipelines';

const nuevoId = () => Math.random().toString(16).slice(2, 14);

const desdeReadme = (tipo, readme) => {
    const r = readme || {};
    if (tipo === 'descripcion') return { parrafos: r.descripcion || [], avisos: r.avisos || [] };
    if (tipo === 'fuente') {
        return { caracteristicas: r.caracteristicas || [], fuente_general: r.fuente_general ?? null, descargas: r.descargas || [] };
    }
    if (tipo === 'variables') return { variables: r.variables || [] };
    return CONTENIDO_VACIO[tipo];
};

export default function PipelineEditorPage() {
    const { clave } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const permisos = user?.permissions || [];
    const puedeEditar = permisos.includes(PERMISO_EDITAR);
    const puedePublicar = permisos.includes(PERMISO_PUBLICAR);
    const editores = usePresencia(rutaPresencia(clave), puedeEditar);
    const [detalle, setDetalle] = useState(null);
    const [pagina, setPagina] = useState(null);
    const [sucio, setSucio] = useState(false);
    const [ocupado, setOcupado] = useState(false);
    const [editando, setEditando] = useState(null);

    const aplicarDetalle = useCallback((d) => {
        setDetalle(d);
        setPagina(d.borrador);
        setSucio(false);
    }, []);

    useEffect(() => {
        obtenerPipeline(clave)
            .then(aplicarDetalle)
            .catch((err) => message.error(errorDetalle(err, 'No se pudo cargar el pipeline')));
    }, [clave, aplicarDetalle]);

    const cambiar = (cambios) => {
        setPagina((prev) => ({ ...prev, ...cambios }));
        setSucio(true);
    };

    const ejecutar = async (accion, exito) => {
        setOcupado(true);
        try {
            aplicarDetalle(await accion());
            message.success(exito);
        } catch (err) {
            message.error(errorDetalle(err, 'No se pudo completar la acción'));
        } finally {
            setOcupado(false);
        }
    };

    const guardar = () => ejecutar(() => guardarBorrador(clave, pagina, detalle.actualizado_en), 'Borrador guardado');
    const publicar = () => ejecutar(async () => {
        if (sucio) await guardarBorrador(clave, pagina, detalle.actualizado_en);
        return publicarPipeline(clave);
    }, 'Página publicada');
    const descartar = () => ejecutar(() => descartarBorrador(clave), 'Se descartó el borrador');

    const agregar = ({ key }) => {
        const seccion = {
            id: nuevoId(), tipo: key, titulo: TIPOS[key].etiqueta, visible: true,
            origen: 'manual', editada: false, readme_commit: null, contenido: CONTENIDO_VACIO[key],
        };
        cambiar({ secciones: [...pagina.secciones, seccion] });
        setEditando(seccion);
    };

    const restablecer = (s) => cambiar({
        secciones: pagina.secciones.map((x) => (x.id === s.id
            ? { ...x, contenido: desdeReadme(x.tipo, detalle.readme), editada: false, readme_commit: detalle.readme_commit }
            : x)),
    });

    if (!detalle || !pagina) return <Spin style={{ display: 'block', margin: 48 }} />;

    const presentes = new Set(pagina.secciones.map((s) => s.tipo));
    const opciones = Object.entries(TIPOS)
        .filter(([tipo, t]) => !t.medida || !presentes.has(tipo))
        .map(([tipo, t]) => ({ key: tipo, label: t.etiqueta }));
    const medicion = detalle.medicion;

    return (
        <>
            <PageHeading
                icon={<BookOutlined />}
                title={pagina.titulo}
                description={pagina.producto}
                extra={(
                    <Space wrap>
                        <PresenciaIndicator editores={editores} />
                        <Button shape="round" icon={<ArrowLeftOutlined />} onClick={() => navigate('/sieej/documentacion')}>Volver</Button>
                        <Button shape="round" icon={<ExportOutlined />} href={`${SITIO}/${clave}/`} target="_blank" disabled={!detalle.publicado}>Ver publicada</Button>
                        <Popconfirm title="¿Descartar el borrador y volver a lo publicado?" onConfirm={descartar} disabled={!puedeEditar || !detalle.publicado}>
                            <Button shape="round" icon={<UndoOutlined />} disabled={!puedeEditar || ocupado || !detalle.publicado}>Descartar</Button>
                        </Popconfirm>
                        <Button shape="round" icon={<SaveOutlined />} onClick={guardar} disabled={!puedeEditar || !sucio} loading={ocupado}>Guardar</Button>
                        <Button shape="round" type="primary" icon={<SendOutlined />} onClick={publicar} disabled={!puedePublicar} loading={ocupado}>Publicar</Button>
                    </Space>
                )}
            />
            <Card size="small" style={{ marginBottom: 16 }}>
                <Descriptions size="small" column={{ xs: 1, md: 3 }}>
                    <Descriptions.Item label="Estado">
                        <Tag color={ESTADOS[detalle.estado]?.color}>{ESTADOS[detalle.estado]?.etiqueta}</Tag>
                        {detalle.borrador_pendiente && <Tag>Borrador sin publicar</Tag>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Detectado en">{detalle.fuentes_detectadas.map((f) => <Tag key={f}>{f}</Tag>)}</Descriptions.Item>
                    <Descriptions.Item label="Datos de">
                        {medicion?.origen_base === 'respaldo' ? `Respaldo al ${medicion.corte_respaldo}` : medicion?.origen_base === 'bd' ? 'BD en vivo' : 'Sin BD'}
                    </Descriptions.Item>
                </Descriptions>
            </Card>
            <Form layout="vertical" disabled={!puedeEditar}>
                <Space.Compact style={{ width: '100%', gap: 12 }}>
                    <Form.Item label="Título" style={{ flex: 1 }}>
                        <Input value={pagina.titulo} maxLength={200} onChange={(e) => cambiar({ titulo: e.target.value })} />
                    </Form.Item>
                    <Form.Item label="Producto" style={{ flex: 2 }}>
                        <Input value={pagina.producto} maxLength={300} onChange={(e) => cambiar({ producto: e.target.value })} />
                    </Form.Item>
                </Space.Compact>
            </Form>
            <Card
                size="small"
                title="Secciones"
                extra={(
                    <Dropdown menu={{ items: opciones, onClick: agregar }} disabled={!puedeEditar}>
                        <Button shape="round" icon={<PlusOutlined />}>Agregar sección</Button>
                    </Dropdown>
                )}
            >
                <SeccionesTabla
                    secciones={pagina.secciones}
                    readmeCommit={detalle.readme_commit}
                    soloLectura={!puedeEditar}
                    onCambiar={(secciones) => cambiar({ secciones })}
                    onEditar={setEditando}
                    onRestablecer={restablecer}
                />
            </Card>
            <SeccionDrawer
                seccion={editando}
                medicion={medicion}
                abierto={Boolean(editando)}
                soloLectura={!puedeEditar}
                onCerrar={() => setEditando(null)}
                onAplicar={(s) => {
                    const existe = pagina.secciones.some((x) => x.id === s.id);
                    cambiar({ secciones: existe ? pagina.secciones.map((x) => (x.id === s.id ? s : x)) : [...pagina.secciones, s] });
                    setEditando(null);
                }}
            />
        </>
    );
}
