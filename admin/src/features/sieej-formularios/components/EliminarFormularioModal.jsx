import { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Skeleton, Space, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { triggerDownload } from '@shared/helpers/downloadFile';
import { useAuth } from '@shared/contexts/useAuth';
import { formulariosApi } from '../services/formulariosAdminApi';

const { Paragraph, Text } = Typography;

const ADMIN_GLOBAL = 'tetlamamakani';

export default function EliminarFormularioModal({ formulario, open, onClose, onDone }) {
    const { user } = useAuth();
    const [total, setTotal] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [descargado, setDescargado] = useState(false);
    const [descargando, setDescargando] = useState(false);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);

    const formularioId = formulario?.id;

    useEffect(() => {
        if (!open || !formularioId) return;
        setTexto('');
        setDescargado(false);
        setTotal(null);
        setCargando(true);
        formulariosApi.listEnvios(formularioId, { limit: 1 })
            .then((data) => setTotal(data?.total ?? 0))
            .catch(() => setTotal(0))
            .finally(() => setCargando(false));
    }, [open, formularioId]);

    if (!formulario) return null;

    const conRespuestas = (total ?? 0) > 0;
    const esAdminGlobal = user?.role === ADMIN_GLOBAL;
    const nombreCoincide = texto.trim() === (formulario.nombre || '').trim();
    const listoParaBorrar = !conRespuestas || (esAdminGlobal && descargado && nombreCoincide);

    const handleDescargar = async () => {
        setDescargando(true);
        try {
            const res = await formulariosApi.exportarEnvios(formulario.id, 'xlsx');
            triggerDownload(res, `${formulario.slug || 'formulario'}_envios.xlsx`);
            setDescargado(true);
        } catch {
            message.error('Error al exportar el Excel');
        } finally {
            setDescargando(false);
        }
    };

    const ejecutar = async (confirmacion) => {
        setEnviando(true);
        try {
            const data = await formulariosApi.eliminar(formulario.id, confirmacion);
            message.success(data?.formulario
                ? 'El formulario tiene respuestas: se cerró en vez de eliminarse'
                : 'Formulario eliminado');
            onDone?.();
            onClose?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar');
        } finally {
            setEnviando(false);
        }
    };

    const footer = cargando ? null : [
        <Button key="cancelar" onClick={onClose}>Cancelar</Button>,
        conRespuestas && !esAdminGlobal ? (
            <Button
                key="cerrar"
                type="primary"
                loading={enviando}
                onClick={() => ejecutar(undefined)}
            >
                Cerrar el formulario
            </Button>
        ) : (
            <Button
                key="eliminar"
                danger
                type="primary"
                loading={enviando}
                disabled={!listoParaBorrar}
                onClick={() => ejecutar(conRespuestas ? texto.trim() : undefined)}
            >
                {conRespuestas ? 'Eliminar definitivamente' : 'Eliminar'}
            </Button>
        ),
    ];

    return (
        <Modal
            title={`Eliminar «${formulario.nombre}»`}
            open={open}
            onCancel={onClose}
            footer={footer}
            width={620}
            destroyOnHidden
        >
            {cargando ? <Skeleton active paragraph={{ rows: 3 }} /> : !conRespuestas ? (
                <Paragraph>
                    Este formulario no tiene respuestas. Se eliminarán el formulario, su
                    definición y sus asignaciones. No hay forma de deshacerlo desde el CMS.
                </Paragraph>
            ) : !esAdminGlobal ? (
                <Alert
                    type="warning"
                    showIcon
                    title="Solo el administrador global puede eliminar un formulario con respuestas"
                    description={`Este formulario ya tiene ${total} envío(s) de las dependencias. Puedes cerrarlo: deja de aceptar respuestas y conserva todo lo capturado.`}
                />
            ) : (
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    <Alert
                        type="error"
                        showIcon
                        title={`Se destruirán ${total} envío(s) y todo lo capturado en ellos`}
                        description={(
                            <ul style={{ margin: '8px 0 0', paddingInlineStart: 18 }}>
                                <li>Las respuestas de cada dependencia, su historial de cambios y su bitácora de eventos.</li>
                                <li>Los archivos que subieron, borrados del Acervo. El bucket tiene versionado con retención, así que quedan recuperables un tiempo por el equipo de infraestructura, no desde aquí.</li>
                                <li>Las versiones archivadas de la definición, las asignaciones y los periodos.</li>
                                <li>No hay deshacer desde el CMS.</li>
                            </ul>
                        )}
                    />
                    <Alert
                        type="info"
                        showIcon
                        title="Descarga el respaldo antes de continuar"
                        description={(
                            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                                <Text>
                                    El Excel incluye las respuestas de todos los envíos y el historial
                                    de cambios. Es lo único que quedará de esta captura.
                                </Text>
                                <Button
                                    icon={<DownloadOutlined />}
                                    loading={descargando}
                                    onClick={handleDescargar}
                                >
                                    {descargado ? 'Descargar de nuevo' : 'Descargar envíos (xlsx)'}
                                </Button>
                            </Space>
                        )}
                    />
                    <div>
                        <Paragraph style={{ marginBottom: 8 }}>
                            Escribe el nombre exacto del formulario para confirmar:{' '}
                            <Text strong>{formulario.nombre}</Text>
                        </Paragraph>
                        <Input
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            placeholder={formulario.nombre}
                            disabled={!descargado}
                            status={texto && !nombreCoincide ? 'error' : undefined}
                        />
                        {!descargado && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Se habilita al descargar el respaldo.
                            </Text>
                        )}
                    </div>
                </Space>
            )}
        </Modal>
    );
}
