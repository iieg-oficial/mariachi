import { Button, Drawer, Empty, Space, Typography } from 'antd';
import {
    COLORES_VEREDICTO,
    esHex,
    ratioContraste,
    veredicto,
} from '@features/mel/helpers/contraste';

const { Text } = Typography;

const Muestra = ({ valor }) => (
    esHex(valor)
        ? (
            <span
                style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: '1px solid rgba(0,0,0,0.12)',
                    display: 'inline-block',
                    flexShrink: 0,
                    background: valor,
                }}
            />
        )
        : null
);

const Ratio = ({ valor, fondo }) => {
    const v = veredicto(ratioContraste(valor, fondo));
    if (v.nivel === 'na') return null;
    return (
        <span
            style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '1px 8px',
                borderRadius: 4,
                background: COLORES_VEREDICTO[v.nivel].fondo,
                color: COLORES_VEREDICTO[v.nivel].texto,
            }}
        >
            {v.etiqueta}
        </span>
    );
};

export default function DiffDrawer({ abierto, onCerrar, lista, fondo, guardando, onGuardar }) {
    return (
        <Drawer
            title='Antes de guardar'
            open={abierto}
            onClose={onCerrar}
            width={560}
            footer={(
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button onClick={onCerrar}>Seguir editando</Button>
                    <Button type='primary' loading={guardando} onClick={onGuardar}>
                        Guardar {lista.length === 1 ? 'el cambio' : `los ${lista.length}`}
                    </Button>
                </Space>
            )}
        >
            {lista.length === 0 && <Empty description='Nada pendiente' />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {lista.map((cambio) => (
                    <div key={cambio.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 14 }}>
                        <Text code strong>{cambio.clave}</Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
                            <Space size={9}>
                                <Muestra valor={cambio.antes} />
                                <div>
                                    <div style={{ fontSize: 12.5 }}>{cambio.antes || '—'}</div>
                                    <Text type='secondary' style={{ fontSize: 11 }}>antes</Text>
                                </div>
                            </Space>
                            <Text type='secondary'>→</Text>
                            <Space size={9}>
                                <Muestra valor={cambio.despues} />
                                <div>
                                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{cambio.despues || '—'}</div>
                                    <Text type='secondary' style={{ fontSize: 11 }}>después</Text>
                                </div>
                            </Space>
                            <span style={{ flexGrow: 1 }} />
                            <Space size={8}>
                                <Ratio valor={cambio.antes} fondo={fondo} />
                                <Ratio valor={cambio.despues} fondo={fondo} />
                            </Space>
                        </div>
                    </div>
                ))}
            </div>
        </Drawer>
    );
}
