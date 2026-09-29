import { SettingOutlined } from '@ant-design/icons';
import {
    Badge, Button, Checkbox, Popover, Space, Switch, Tooltip, Typography,
} from 'antd';

import { SIN_CONFIGURACION, configuracionActiva, etiquetaValor } from '@features/vine/constants/filtros';
import { medioInfo } from '@features/vine/constants/medios';

const { Text } = Typography;

const opcionesDe = (filas, campo, etiqueta) => {
    const conteo = new Map();
    filas.forEach((f) => conteo.set(f[campo] ?? '', (conteo.get(f[campo] ?? '') ?? 0) + 1));
    return [...conteo.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([valor, n]) => ({ value: valor, label: `${etiqueta(valor)} (${n})` }));
};

const Grupo = ({ titulo, children }) => (
    <div>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{titulo}</Text>
        {children}
    </div>
);

const ConfiguracionPersonal = ({ filas = [], valores, onCambio }) => {
    const activas = filas.filter((f) => valores.bajas || !f.baja);
    const contenido = (
        <Space orientation="vertical" size={12} style={{ width: 240 }}>
            <Space>
                <Switch size="small" checked={valores.bajas} onChange={(bajas) => onCambio({ ...valores, bajas })} />
                <Text>Mostrar bajas</Text>
            </Space>
            <Grupo titulo="Marca">
                <Checkbox.Group
                    style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                    value={valores.medio}
                    onChange={(medio) => onCambio({ ...valores, medio })}
                    options={opcionesDe(activas, 'medio', (v) => (v ? medioInfo(v).etiqueta : 'Sin dato'))}
                />
            </Grupo>
            <Grupo titulo="Horario">
                <Checkbox.Group
                    style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                    value={valores.horario}
                    onChange={(horario) => onCambio({ ...valores, horario })}
                    options={opcionesDe(activas, 'horario', (v) => etiquetaValor('horario', v))}
                />
            </Grupo>
            {configuracionActiva(valores) && (
                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onCambio(SIN_CONFIGURACION)}>
                    Quitar todo
                </Button>
            )}
        </Space>
    );

    return (
        <Popover trigger="click" placement="bottomRight" content={contenido}>
            <Tooltip title="Configuración">
                <Badge dot={configuracionActiva(valores)} color="blue" offset={[-4, 4]}>
                    <Button shape="circle" icon={<SettingOutlined />} aria-label="Configuración" />
                </Badge>
            </Tooltip>
        </Popover>
    );
};

export default ConfiguracionPersonal;
