import { Input, Typography } from 'antd';
import { CAMPOS_LARGOS, SECCIONES } from '@features/mel/constants/campos';

const { Text } = Typography;
const { TextArea } = Input;

export default function CamposPanel({ campos = {}, valorDeCampo, onCambiar }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {SECCIONES.map((seccion) => (
                <div key={seccion.titulo}>
                    <Text strong style={{ fontSize: 13 }}>{seccion.titulo}</Text>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {seccion.campos.map(([clave, etiqueta]) => {
                            const actual = campos[clave] || '';
                            const valor = valorDeCampo(clave, actual);
                            const vacio = valor.trim() === '';
                            return (
                                <div key={clave} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                    <Text
                                        type={vacio ? 'secondary' : undefined}
                                        style={{ width: 178, flexShrink: 0, fontSize: 13, paddingTop: 5 }}
                                    >
                                        {etiqueta}
                                    </Text>
                                    {CAMPOS_LARGOS.has(clave) ? (
                                        <TextArea
                                            rows={2}
                                            value={valor}
                                            placeholder='Sin definir'
                                            onChange={(evento) => onCambiar(clave, evento.target.value, actual)}
                                        />
                                    ) : (
                                        <Input
                                            size='small'
                                            value={valor}
                                            placeholder='Sin definir'
                                            onChange={(evento) => onCambiar(clave, evento.target.value, actual)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            <Text type='secondary' style={{ fontSize: 13 }}>
                Lo que se deje vacío no aparece en la guía generada.
            </Text>
        </div>
    );
}
