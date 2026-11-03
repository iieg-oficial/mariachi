import { useMemo, useState } from 'react';
import { Button, Popover, Space, Tooltip, TreeSelect, Typography } from 'antd';
import {
    ApartmentOutlined,
    CloseOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    FolderOpenOutlined,
    PlusOutlined,
    StopOutlined,
} from '@ant-design/icons';
import AltaCapasDrawer from '@features/mapalab-layers/components/AltaCapasDrawer';
import { contextoDeUbicacion, descendientes, planDeMovimiento } from '@features/mapalab-layers/utils/gridArbol';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Text } = Typography;

const BARRA = {
    position: 'absolute',
    left: '50%',
    bottom: 16,
    transform: 'translateX(-50%)',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: 4,
    borderRadius: 28,
    background: '#1f1f1f',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.22)',
    maxWidth: 'calc(100% - 24px)',
};

const BOTON = { color: '#fff', height: 36 };

const CONTADOR = {
    minWidth: 24,
    height: 24,
    padding: '0 8px',
    borderRadius: 12,
    background: '#fff',
    color: '#1f1f1f',
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 4px',
    whiteSpace: 'nowrap',
};

function Accion({ icono, texto, soloIcono, onClick, primario }) {
    const estilo = primario ? { ...BOTON, background: '#5C2472', borderColor: '#5C2472' } : BOTON;
    if (soloIcono) {
        return (
            <Tooltip title={texto}>
                <Button
                    shape="circle"
                    type={primario ? 'primary' : 'text'}
                    size="large"
                    icon={icono}
                    aria-label={texto}
                    onClick={onClick}
                    style={{ ...estilo, width: 44, height: 44 }}
                />
            </Tooltip>
        );
    }
    return (
        <Button shape="round" type={primario ? 'primary' : 'text'} icon={icono} onClick={onClick} style={estilo}>
            {texto}
        </Button>
    );
}

export default function GridAccionesFlotantes({ data, selectedRows, setSelectedKeys, applyPatches, reload }) {
    const { isMobile } = useIsMobile();
    const [altaOpen, setAltaOpen] = useState(false);
    const [moverOpen, setMoverOpen] = useState(false);
    const [destino, setDestino] = useState(null);
    const contexto = useMemo(() => contextoDeUbicacion(data), [data]);
    const total = selectedRows.length;

    const marcar = (column, value) => applyPatches(
        selectedRows.map((fila) => ({ rowKey: fila.id, column, value })),
    );

    const seleccionarHijas = () => {
        const ids = selectedRows.map((fila) => fila.id);
        setSelectedKeys(new Set([...ids, ...descendientes(data, ids)]));
    };

    const mover = () => {
        const { parches, omitidas, motivo } = planDeMovimiento(data, selectedRows, destino);
        if (motivo) {
            message.error(motivo);
            return;
        }
        applyPatches(parches);
        if (omitidas) message.info(`${omitidas} no se movieron: temas, hijas que ya van con su padre o las que ya estaban ahí`);
        setMoverOpen(false);
        setDestino(null);
    };

    const panelMover = (
        <Space orientation="vertical" size={10} style={{ width: isMobile ? 280 : 360 }}>
            <Text strong>{`Mover ${total} ${total === 1 ? 'nodo' : 'nodos'} a…`}</Text>
            <TreeSelect
                style={{ width: '100%' }}
                value={destino ?? undefined}
                treeData={contexto.treeData}
                showSearch={{ treeNodeFilterProp: 'title' }}
                placeholder="Buscar destino"
                onChange={setDestino}
                popupMatchSelectWidth={false}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
                {destino
                    ? `Quedan al final de ${contexto.pathOf(destino)}, con sus hijas y en su orden actual.`
                    : 'Se mueven con sus hijas y quedan al final del destino.'}
            </Text>
            <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                <Button shape="round" onClick={() => setMoverOpen(false)}>Cancelar</Button>
                <Button shape="round" type="primary" disabled={!destino} onClick={mover}>Mover aquí</Button>
            </Space>
        </Space>
    );

    return (
        <>
            <div style={BARRA} role="toolbar" aria-label="Acciones de la tabla">
                <Accion primario soloIcono={isMobile} icono={<PlusOutlined />} texto="Agregar filas" onClick={() => setAltaOpen(true)} />
                {total > 0 && (
                    <>
                        <span style={CONTADOR}>{isMobile ? total : `${total} ${total === 1 ? 'seleccionada' : 'seleccionadas'}`}</span>
                        <Popover open={moverOpen} onOpenChange={setMoverOpen} trigger="click" content={panelMover} placement="top">
                            <span>
                                <Accion soloIcono={isMobile} icono={<FolderOpenOutlined />} texto="Mover a…" />
                            </span>
                        </Popover>
                        <Accion soloIcono={isMobile} icono={<EyeInvisibleOutlined />} texto="Ocultar" onClick={() => marcar('hidden_in_menu', true)} />
                        <Accion soloIcono={isMobile} icono={<EyeOutlined />} texto="Mostrar" onClick={() => marcar('hidden_in_menu', false)} />
                        <Accion soloIcono={isMobile} icono={<StopOutlined />} texto="Deshabilitar" onClick={() => marcar('disabled', true)} />
                        <Accion soloIcono={isMobile} icono={<ApartmentOutlined />} texto="Seleccionar hijas" onClick={seleccionarHijas} />
                        <Accion soloIcono icono={<CloseOutlined />} texto="Quitar selección" onClick={() => setSelectedKeys(new Set())} />
                    </>
                )}
            </div>
            <AltaCapasDrawer open={altaOpen} onClose={() => setAltaOpen(false)} onCreated={reload} />
        </>
    );
}
