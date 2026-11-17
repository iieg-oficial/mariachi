import { Button, Space, Tooltip } from 'antd';
import { InfoCircleOutlined, VerticalAlignTopOutlined } from '@ant-design/icons';
import {
    grupoDePropiedad,
    mismaTarjetita,
    tarjetitaComun,
} from '@features/mapalab-layers/utils/propagacionTarjetita';
import { useTarjetitaAlGrupo } from '@features/mapalab-layers/hooks/useTarjetitaAlGrupo';

const Info = ({ title }) => (
    <Tooltip title={title}>
        <Button size="small" type="text" icon={<InfoCircleOutlined />} aria-label="Más información" />
    </Tooltip>
);

export function UsarLaDeSusPropiedades({ rawTree, groupId, updateLayer, reload, onAplicado, puedePublicar }) {
    const { aplicando, confirmar } = useTarjetitaAlGrupo({ updateLayer, reload, onAplicado });
    const comun = tarjetitaComun(rawTree, groupId);
    if (!comun) return null;

    const n = comun.ids.length;
    return (
        <Space size={4}>
            <Button
                shape="round"
                type="primary"
                loading={aplicando}
                disabled={!puedePublicar}
                onClick={() => confirmar({
                    groupId,
                    config: comun.config,
                    ids: comun.ids,
                    titulo: `¿Usar la tarjetita de sus ${n} propiedades para todo el grupo?`,
                })}
            >
                Usar la de sus {n} propiedades
            </Button>
            <Info title={`Las ${n} propiedades tienen la misma tarjetita copiada. Pasa al grupo y se edita en un solo lugar.${puedePublicar ? '' : ' Solo quien publica puede aplicarlo.'}`} />
        </Space>
    );
}

export function PasarAlGrupo({ rawTree, layerId, value, updateLayer, reload, onAplicado, puedePublicar }) {
    const { aplicando, confirmar } = useTarjetitaAlGrupo({ updateLayer, reload, onAplicado });
    const grupo = grupoDePropiedad(rawTree, layerId);
    const comun = grupo ? tarjetitaComun(rawTree, grupo.id) : null;
    if (!comun || !comun.ids.includes(layerId) || !mismaTarjetita(value, comun.config)) return null;

    const n = comun.ids.length;
    return (
        <Space size={2}>
            <Button
                size="small"
                shape="round"
                icon={<VerticalAlignTopOutlined />}
                loading={aplicando}
                disabled={!puedePublicar}
                onClick={() => confirmar({
                    groupId: comun.grupo.id,
                    config: comun.config,
                    ids: comun.ids,
                    titulo: `¿Pasar esta tarjetita al grupo «${comun.grupo.label}»?`,
                })}
            >
                Pasar al grupo
            </Button>
            <Info title={`Igual en las ${n} propiedades de «${comun.grupo.label}». En el grupo se edita una vez y la usan todas.${puedePublicar ? '' : ' Solo quien publica puede aplicarlo.'}`} />
        </Space>
    );
}
