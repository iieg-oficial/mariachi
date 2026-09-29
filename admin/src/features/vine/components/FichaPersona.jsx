import { App, Avatar, Col, Descriptions, Row, Spin, Tabs, Tag, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import useIsMobile from '@shared/hooks/useIsMobile';
import { useAuth } from '@shared/contexts/useAuth';
import { getDetallePersona, guardarFicha } from '@features/vine/api/vineService';
import { colorAvatar, iniciales } from '@features/vine/components/columnasPersonal';
import FormularioFicha from '@features/vine/components/FormularioFicha';
import PanelAsistencia from '@features/vine/components/PanelAsistencia';
import PanelIncidencias from '@features/vine/components/PanelIncidencias';
import { COLOR_VINCULO } from '@features/vine/constants';
import { medioInfo } from '@features/vine/constants/medios';

const { Text } = Typography;

const PERMISO_EDITAR = 'mariachi.vine_personas.update';

const HORARIOS = { '8-16': '8 a 4', '9-17': '9 a 5', otro: 'Sin horario fijo' };

const fecha = (v) => (v
    ? new Date(`${v}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—');

const vacio = <Text type="secondary">Sin dato</Text>;

const Resumen = ({ fila, compacto }) => (
    <Descriptions
        size="small"
        colon={false}
        layout={compacto ? 'vertical' : 'horizontal'}
        column={compacto ? 1 : { sm: 2, xl: 3 }}
    >
        <Descriptions.Item label="PIN">{fila.pin}</Descriptions.Item>
        <Descriptions.Item label="Correo">{fila.email || vacio}</Descriptions.Item>
        <Descriptions.Item label="Teléfono">{fila.telefono || vacio}</Descriptions.Item>
        <Descriptions.Item label="Área">{fila.departamento || vacio}</Descriptions.Item>
        <Descriptions.Item label="Puesto">{fila.puesto || vacio}</Descriptions.Item>
        <Descriptions.Item label="Vínculo">
            {fila.vinculo ? <Tag color={COLOR_VINCULO[fila.vinculo] ?? 'default'}>{fila.vinculo}</Tag> : vacio}
        </Descriptions.Item>
        <Descriptions.Item label="Marca con">
            {fila.medio ? <Tag color={medioInfo(fila.medio).color}>{medioInfo(fila.medio).etiqueta}</Tag> : vacio}
        </Descriptions.Item>
        <Descriptions.Item label="Horario">{HORARIOS[fila.horario] ?? vacio}</Descriptions.Item>
        <Descriptions.Item label="Entra y sale">
            {fila.entrada_habitual ? `${fila.entrada_habitual} · ${fila.salida_habitual ?? '—'}` : vacio}
        </Descriptions.Item>
        <Descriptions.Item label="Días que vino">
            {fila.dias ? `${fila.dias} de ${fila.habiles} hábiles` : vacio}
        </Descriptions.Item>
        <Descriptions.Item label="Jornadas medibles">
            {fila.dias ? `${fila.medibles} con entrada y salida` : vacio}
        </Descriptions.Item>
        <Descriptions.Item label="Horas acumuladas">
            {fila.horas ? `${fila.horas.toLocaleString('es-MX')} h` : vacio}
        </Descriptions.Item>
        <Descriptions.Item label="Cumpleaños">{fecha(fila.cumpleanos)}</Descriptions.Item>
        <Descriptions.Item label="Ingreso">{fecha(fila.fecha_ingreso)}</Descriptions.Item>
        <Descriptions.Item label="Último registro">{fecha(fila.ultimo_dia)}</Descriptions.Item>
        {fila.notas && <Descriptions.Item label="Notas" span={3}>{fila.notas}</Descriptions.Item>}
    </Descriptions>
);

const Biometrico = ({ bio, compacto }) => (
    <Descriptions
        size="small"
        colon={false}
        bordered
        layout={compacto ? 'vertical' : 'horizontal'}
        column={compacto ? 1 : 2}
    >
        <Descriptions.Item label="PIN">{bio?.pin}</Descriptions.Item>
        <Descriptions.Item label="Nombre">{bio?.nombre || vacio}</Descriptions.Item>
        <Descriptions.Item label="Apellidos">{bio?.apellidos || vacio}</Descriptions.Item>
        <Descriptions.Item label="Correo">{bio?.email || vacio}</Descriptions.Item>
        <Descriptions.Item label="Departamento">{bio?.departamento || vacio}</Descriptions.Item>
        <Descriptions.Item label="Puesto">{bio?.puesto || vacio}</Descriptions.Item>
        <Descriptions.Item label="Sincronizado" span={2}>
            {bio?.sincronizado_at ? new Date(bio.sincronizado_at).toLocaleString('es-MX') : vacio}
        </Descriptions.Item>
    </Descriptions>
);

const FichaPersona = ({ fila, onGuardado, tab, onTab }) => {
    const { can } = useAuth();
    const { isMobile } = useIsMobile();
    const { message } = App.useApp();
    const puedeEditar = can(PERMISO_EDITAR);

    const [detalle, setDetalle] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            setDetalle(await getDetallePersona(fila.pin));
        } catch {
            setDetalle(null);
        } finally {
            setCargando(false);
        }
    }, [fila.pin]);

    useEffect(() => { cargar(); }, [cargar]);

    const onGuardar = async (datos) => {
        setGuardando(true);
        try {
            await guardarFicha(fila.pin, datos);
            message.success('Ficha guardada');
            await cargar();
            onGuardado?.();
        } catch (e) {
            message.error(e?.response?.data?.detail || 'No se pudo guardar la ficha');
        } finally {
            setGuardando(false);
        }
    };

    const pestanas = [
        {
            key: 'ficha',
            label: 'Ficha',
            children: cargando
                ? <Spin />
                : (puedeEditar
                    ? (
                        <FormularioFicha
                            fila={fila}
                            ficha={detalle?.ficha}
                            guardando={guardando}
                            onGuardar={onGuardar}
                        />
                    )
                    : <Resumen fila={fila} compacto={isMobile} />),
        },
        {
            key: 'incidencias',
            label: 'Vacaciones y permisos',
            children: (
                <PanelIncidencias pin={fila.pin} puedeEditar={puedeEditar} onCambio={onGuardado} />
            ),
        },
        {
            key: 'asistencia',
            label: 'Asistencia',
            children: <PanelAsistencia fila={fila} />,
        },
        {
            key: 'biometrico',
            label: 'ZKTeco',
            children: cargando ? <Spin /> : <Biometrico bio={detalle?.biometrico} compacto={isMobile} />,
        },
    ];

    const activa = tab ?? 'ficha';

    return (
        <Row gutter={[24, 16]} wrap={false} style={{ padding: isMobile ? '4px 0' : '4px 8px' }}>
            {!isMobile && activa === 'ficha' && (
                <Col flex="none">
                    <Avatar
                        size={72}
                        src={fila.foto_url || undefined}
                        style={{ backgroundColor: colorAvatar(fila.pin), fontSize: 26 }}
                    >
                        {iniciales(fila.nombre, fila.pin)}
                    </Avatar>
                    {fila.editada && (
                        <Tag color="blue" style={{ marginTop: 8, display: 'block', textAlign: 'center' }}>
                            editada
                        </Tag>
                    )}
                </Col>
            )}
            <Col flex="1 1 0" style={{ minWidth: 0, overflow: 'hidden' }}>
                <Tabs activeKey={activa} onChange={onTab} size="small" items={pestanas} />
            </Col>
        </Row>
    );
};

export default FichaPersona;
