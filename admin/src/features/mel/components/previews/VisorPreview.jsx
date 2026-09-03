import { Button, Typography } from 'antd';
import { aclarar, esHex } from '@features/mel/helpers/contraste';

const { Text } = Typography;

const PASOS = [0.86, 0.66, 0.44, 0.22, 0];
const RANGOS = ['0 – 120', '120 – 340', '340 – 780', '780 – 1 500', 'más de 1 500'];

export default function VisorPreview({ color }) {
    const acento = esHex(color) ? color : '#5C2472';
    const rampa = PASOS.map((paso) => aclarar(acento, paso));

    return (
        <div style={{ display: 'flex', gap: 20, height: '100%' }}>
            <div style={{ flexGrow: 1, border: '1px solid #f0f0f0', borderRadius: 8, background: '#eef1f4', position: 'relative', overflow: 'hidden', minWidth: 0 }}>
                <div style={{ position: 'absolute', left: 14, top: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Button type='primary' style={{ background: acento }}>Capas</Button>
                    <Button>Medir</Button>
                </div>
                <div style={{ position: 'absolute', right: 14, bottom: 14, background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8, padding: '10px 12px' }}>
                    <Text strong style={{ fontSize: 12 }}>Delitos por municipio</Text>
                    <div style={{ marginTop: 7 }}>
                        {rampa.map((tono, indice) => (
                            <div key={RANGOS[indice]} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                                <span style={{ width: 14, height: 14, borderRadius: 4, background: tono, display: 'inline-block' }} />
                                <Text type='secondary' style={{ fontSize: 11.5 }}>{RANGOS[indice]}</Text>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ position: 'absolute', left: '42%', top: '30%', width: 132, height: 104, borderRadius: '40% 60% 45% 55%', background: acento, opacity: 0.75 }} />
                <div style={{ position: 'absolute', left: '24%', top: '52%', width: 100, height: 80, borderRadius: '55% 45% 60% 40%', background: acento, opacity: 0.35 }} />
            </div>

            <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
                <Text strong>Paleta secuencial</Text>
                <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {rampa.map((tono) => (
                        <span key={tono} style={{ flexGrow: 1, background: tono }} />
                    ))}
                </div>
                <Text type='secondary' style={{ fontSize: 13 }}>
                    Se deriva del color seleccionado. Cambiarlo mueve el mapa entero.
                </Text>
            </div>
        </div>
    );
}
