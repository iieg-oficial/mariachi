import { Button, Card, Tag, Tooltip, Typography } from 'antd';
import {
    EditOutlined, DeleteOutlined, PlayCircleOutlined,
    CloseCircleOutlined, InboxOutlined, TeamOutlined, SyncOutlined,
} from '@ant-design/icons';
import { frecuenciaLabel } from '../constants/definitionTypes';

const { Title, Paragraph, Text } = Typography;

const ESTADO_COLOR = { borrador: 'default', activo: 'green', cerrado: 'red' };
const ESTADO_LABEL = { borrador: 'Borrador', activo: 'Activo', cerrado: 'Cerrado' };

const formatDate = (iso) => {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
};

const Vigencia = ({ inicio, fin, periodicidad }) => {
    if (periodicidad) {
        return (
            <Text type="secondary" style={{ fontSize: 12 }}>
                <SyncOutlined style={{ marginInlineEnd: 4 }} />
                {`Periódico · ${frecuenciaLabel(periodicidad.frecuencia)} · ${periodicidad.duracion_dias} día(s)`}
            </Text>
        );
    }
    if (!inicio && !fin) {
        return <Text type="secondary" style={{ fontSize: 12 }}>Sin vigencia</Text>;
    }
    const finDate = fin ? new Date(fin) : null;
    const vencida = finDate && finDate < new Date();
    return (
        <Text
            type={vencida ? 'danger' : 'secondary'}
            style={{ fontSize: 12 }}
        >
            {fin
                ? (vencida ? `Venció el ${formatDate(fin)}` : `Hasta ${formatDate(fin)}`)
                : `Desde ${formatDate(inicio)}`}
        </Text>
    );
};

const FormularioCard = ({
    formulario, onEditar, onEnvios, onPublicar, onCerrar, onEliminar, onAsignaciones,
}) => {
    const stop = (handler) => (e) => {
        e.stopPropagation();
        handler();
    };

    const actions = [
        <Tooltip key="editar" title="Editar">
            <Button type="text" icon={<EditOutlined />} onClick={stop(onEditar)} aria-label="Editar" />
        </Tooltip>,
        <Tooltip key="envios" title="Envíos">
            <Button type="text" icon={<InboxOutlined />} onClick={stop(onEnvios)} aria-label="Envíos" />
        </Tooltip>,
        <Tooltip key="asignaciones" title="Asignaciones">
            <Button type="text" icon={<TeamOutlined />} onClick={stop(onAsignaciones)} aria-label="Asignaciones" />
        </Tooltip>,
        formulario.estado === 'borrador' ? (
            <Tooltip key="publicar" title="Publicar">
                <Button type="text" icon={<PlayCircleOutlined />} onClick={stop(onPublicar)} aria-label="Publicar" />
            </Tooltip>
        ) : formulario.estado === 'activo' ? (
            <Tooltip key="cerrar" title="Cerrar">
                <Button type="text" icon={<CloseCircleOutlined />} onClick={stop(onCerrar)} aria-label="Cerrar" />
            </Tooltip>
        ) : (
            <span key="placeholder" />
        ),
        <Tooltip key="eliminar" title="Eliminar">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={stop(onEliminar)} aria-label="Eliminar" />
        </Tooltip>,
    ];

    return (
        <Card
            hoverable
            onClick={onEditar}
            actions={actions}
            styles={{ body: { padding: 16, flex: 1 } }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <Title level={5} style={{ margin: 0, lineHeight: 1.3 }} ellipsis={{ rows: 2 }}>
                    {formulario.nombre}
                </Title>
                <Tag color={ESTADO_COLOR[formulario.estado]} style={{ flexShrink: 0, marginInlineEnd: 0 }}>
                    {ESTADO_LABEL[formulario.estado] || formulario.estado}
                </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                {formulario.slug} · v{formulario.version}
            </Text>
            {formulario.descripcion && (
                <Paragraph
                    type="secondary"
                    ellipsis={{ rows: 2 }}
                    style={{ marginTop: 8, marginBottom: 8, fontSize: 13 }}
                >
                    {formulario.descripcion}
                </Paragraph>
            )}
            <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                <Vigencia
                    inicio={formulario.vigencia_inicio}
                    fin={formulario.vigencia_fin}
                    periodicidad={formulario.periodicidad}
                />
            </div>
        </Card>
    );
};

export default FormularioCard;
