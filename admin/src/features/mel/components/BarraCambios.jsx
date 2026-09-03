import { Button, Typography } from 'antd';

const { Text } = Typography;

export default function BarraCambios({ lista, guardando, onVerDiff, onDescartar, onGuardar }) {
    const hay = lista.length > 0;
    const claves = lista.slice(0, 3).map((cambio) => cambio.clave).join(' · ');
    const resto = lista.length > 3 ? ` y ${lista.length - 3} más` : '';

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 24px',
                background: '#fff',
                borderTop: '1px solid rgba(5,5,5,0.06)',
            }}
        >
            <span
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: hay ? '#FF8300' : '#d9d9d9',
                }}
            />
            <Text strong>
                {hay ? `${lista.length} ${lista.length === 1 ? 'cambio' : 'cambios'} sin guardar` : 'Sin cambios pendientes'}
            </Text>
            {hay && <Text type='secondary' style={{ fontSize: 13 }}>{claves}{resto}</Text>}
            <span style={{ flexGrow: 1 }} />
            <Button disabled={!hay} onClick={onVerDiff}>Ver diff</Button>
            <Button disabled={!hay || guardando} onClick={onDescartar}>Descartar</Button>
            <Button type='primary' disabled={!hay} loading={guardando} onClick={onGuardar}>
                {hay ? `Guardar ${lista.length === 1 ? 'el cambio' : `los ${lista.length}`}` : 'Guardar'}
            </Button>
        </div>
    );
}
