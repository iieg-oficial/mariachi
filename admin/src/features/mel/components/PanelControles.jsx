import { Input, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import ColoresPanel from '@features/mel/components/ColoresPanel';
import GruposPanel from '@features/mel/components/GruposPanel';

const { Text } = Typography;

export default function PanelControles({
    ancho,
    busqueda,
    onBuscar,
    totalTokens,
    totalCampos,
    colores,
    filtrados,
    noAlcanzan,
    fondo,
    colorTexto,
    seleccion,
    onSeleccionar,
    elemento,
    tokens,
    campos,
    grupoAbierto,
    onAbrirGrupo,
    sinDefinir,
    cambios,
    ancla,
    onCerrarAncla,
}) {
    return (
        <div
            style={{
                width: ancho,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                borderRight: '1px solid rgba(5,5,5,0.06)',
                minHeight: 0,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(5,5,5,0.06)',
                }}
            >
                <Input
                    prefix={<SearchOutlined />}
                    placeholder='Buscar token de color…'
                    value={busqueda}
                    onChange={(evento) => onBuscar(evento.target.value)}
                    allowClear
                />
                <Text type='secondary' style={{ whiteSpace: 'nowrap' }}>
                    {totalTokens} tokens · {totalCampos} campos
                </Text>
            </div>

            <div style={{ flexGrow: 1, padding: 16, overflow: 'auto', minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Text strong>Color</Text>
                    <Tag>{colores.length}</Tag>
                    <span style={{ flexGrow: 1 }} />
                    <Text style={{ fontSize: 12, color: noAlcanzan > 0 ? '#d4380d' : '#1F7A4D' }}>
                        {noAlcanzan > 0 ? `${noAlcanzan} no alcanza AA` : 'todos cumplen AA'}
                    </Text>
                </div>

                <ColoresPanel
                    tokens={filtrados}
                    fondo={fondo}
                    colorTexto={colorTexto}
                    seleccion={seleccion}
                    onSeleccionar={onSeleccionar}
                    valorDeToken={cambios.valorDeToken}
                    onCambiar={cambios.cambiarToken}
                    elemento={elemento}
                    ancla={ancla}
                    onCerrarAncla={onCerrarAncla}
                />

                <GruposPanel
                    tokens={tokens}
                    campos={campos}
                    abierto={grupoAbierto}
                    onAbrir={onAbrirGrupo}
                    valorDeToken={cambios.valorDeToken}
                    onCambiarToken={cambios.cambiarToken}
                    valorDeCampo={cambios.valorDeCampo}
                    onCambiarCampo={cambios.cambiarCampo}
                    sinDefinir={sinDefinir}
                    seleccion={seleccion}
                    onSeleccionar={onSeleccionar}
                    elemento={elemento}
                    ancla={ancla}
                    onCerrarAncla={onCerrarAncla}
                    fondo={fondo}
                    colorTexto={colorTexto}
                />
            </div>
        </div>
    );
}
