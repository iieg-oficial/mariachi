import { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Space, Typography } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { triggerDownload } from '@shared/helpers/downloadFile';
import { formulariosApi } from '../services/formulariosAdminApi';

const { Paragraph, Text } = Typography;

export default function EliminarEnvioModal({ formulario, envio, open, onClose, onDone }) {
    const [descargado, setDescargado] = useState(false);
    const [descargando, setDescargando] = useState(false);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (!open) return;
        setTexto('');
        setDescargado(false);
    }, [open, envio?.id]);

    if (!envio) return null;

    const dependencia = envio.usuario_nombre || envio.usuario_email || `usuario ${envio.usuario_id}`;
    const nombreCoincide = texto.trim() === (envio.usuario_nombre || '').trim();
    const listo = descargado && nombreCoincide;

    const handlePdf = async () => {
        setDescargando(true);
        try {
            const res = await formulariosApi.descargarEnvioPdf(formulario.id, envio.id);
            triggerDownload(res, `envio_${envio.id}.pdf`);
            setDescargado(true);
        } catch {
            message.error('Error al generar el PDF');
        } finally {
            setDescargando(false);
        }
    };

    const handleEliminar = async () => {
        setEnviando(true);
        try {
            await formulariosApi.eliminarEnvio(formulario.id, envio.id, texto.trim());
            message.success('Envío eliminado');
            onDone?.();
            onClose?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar el envío');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Modal
            title={`Eliminar el envío #${envio.id} de ${dependencia}`}
            open={open}
            onCancel={onClose}
            width={620}
            destroyOnHidden
            footer={[
                <Button key="cancelar" onClick={onClose}>Cancelar</Button>,
                <Button
                    key="eliminar"
                    danger
                    type="primary"
                    loading={enviando}
                    disabled={!listo}
                    onClick={handleEliminar}
                >
                    Eliminar definitivamente
                </Button>,
            ]}
        >
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                <Alert
                    type="error"
                    showIcon
                    title="Se destruye lo que capturó esta dependencia"
                    description={(
                        <ul style={{ margin: '8px 0 0', paddingInlineStart: 18 }}>
                            <li>Sus respuestas, el historial de correcciones y la bitácora de eventos del envío.</li>
                            <li>Los archivos que subió, borrados del Acervo. Quedan como versiones recuperables por infraestructura un tiempo, no desde aquí.</li>
                            <li>El formulario le aparecerá como no iniciado y podrá capturar de cero.</li>
                            <li>No hay deshacer desde el CMS.</li>
                        </ul>
                    )}
                />
                <Alert
                    type="warning"
                    showIcon
                    title="¿Solo quieres que corrija lo que puso?"
                    description="Reabrir el envío (la flecha de esta misma tabla) se lo devuelve para editarlo conservando todo lo escrito. Eliminar es para capturas de prueba o equivocadas que deben desaparecer."
                />
                <Alert
                    type="info"
                    showIcon
                    title="Descarga el PDF antes de continuar"
                    description={(
                        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                            <Text>Es el único registro que quedará de lo que capturó.</Text>
                            <Button
                                icon={<FilePdfOutlined />}
                                loading={descargando}
                                onClick={handlePdf}
                            >
                                {descargado ? 'Descargar de nuevo' : 'Descargar PDF del envío'}
                            </Button>
                        </Space>
                    )}
                />
                <div>
                    <Paragraph style={{ marginBottom: 8 }}>
                        Escribe el nombre exacto de la dependencia para confirmar:{' '}
                        <Text strong>{envio.usuario_nombre || dependencia}</Text>
                    </Paragraph>
                    <Input
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        placeholder={envio.usuario_nombre || ''}
                        disabled={!descargado}
                        status={texto && !nombreCoincide ? 'error' : undefined}
                    />
                    {!descargado && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Se habilita al descargar el PDF.
                        </Text>
                    )}
                </div>
            </Space>
        </Modal>
    );
}
