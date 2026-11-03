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
import GridBarSeparator from '@shared/components/dataGrid/GridBarSeparator';
import { message } from '@shared/services/message';

const { Text } = Typography;

const CONTADOR = {
    height: 24,
    padding: '0 10px',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.14)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
};

function Accion({ icono, texto, iconOnly, onClick, variante = 'text' }) {
    if (iconOnly) {
        return (
            <Tooltip title={texto}>
                <Button shape="circle" type={variante} icon={icono} aria-label={texto} onClick={onClick} />
            </Tooltip>
        );
    }
    return (
        <Button shape="round" type={variante} icon={icono} onClick={onClick}>
            {texto}
        </Button>
    );
}

export default function GridAccionesFlotantes({ data, selectedRows, setSelectedKeys, applyPatches, reload, iconOnly }) {
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
        if (omitidas) message.info(`${omitidas} sin mover: los temas van en la raíz y otras ya estaban ahí`);
        setMoverOpen(false);
        setDestino(null);
    };

    const panelMover = (
        <Space orientation="vertical" size={10} style={{ width: iconOnly ? 280 : 360 }}>
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
            <Accion iconOnly={iconOnly} variante="default" icono={<PlusOutlined />} texto="Agregar filas" onClick={() => setAltaOpen(true)} />
            {total > 0 && (
                <>
                    <GridBarSeparator />
                    <span style={CONTADOR}>{iconOnly ? total : `${total} ${total === 1 ? 'seleccionada' : 'seleccionadas'}`}</span>
                    <Popover open={moverOpen} onOpenChange={setMoverOpen} trigger="click" content={panelMover} placement="top">
                        <span>
                            <Accion iconOnly={iconOnly} icono={<FolderOpenOutlined />} texto="Mover a…" />
                        </span>
                    </Popover>
                    <Accion iconOnly={iconOnly} icono={<EyeInvisibleOutlined />} texto="Ocultar" onClick={() => marcar('hidden_in_menu', true)} />
                    <Accion iconOnly={iconOnly} icono={<EyeOutlined />} texto="Mostrar" onClick={() => marcar('hidden_in_menu', false)} />
                    <Accion iconOnly={iconOnly} icono={<StopOutlined />} texto="Deshabilitar" onClick={() => marcar('disabled', true)} />
                    <Accion iconOnly={iconOnly} icono={<ApartmentOutlined />} texto="Seleccionar hijas" onClick={seleccionarHijas} />
                    <Accion iconOnly icono={<CloseOutlined />} texto="Quitar selección" onClick={() => setSelectedKeys(new Set())} />
                </>
            )}
            <AltaCapasDrawer open={altaOpen} onClose={() => setAltaOpen(false)} onCreated={reload} />
        </>
    );
}
