import { useMemo } from 'react';
import { Button, Tag, Typography } from 'antd';
import Composicion from '@features/mel/components/previews/Composicion';
import { aplicacionDe } from '@features/mel/helpers/aplicacion';

const { Text } = Typography;

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const aPx = (valor) => {
    const texto = String(valor ?? '').trim();
    if (texto.endsWith('rem')) return Math.round(parseFloat(texto) * 16);
    if (texto.endsWith('px')) return Math.round(parseFloat(texto));
    return null;
};

export default function VistaPrevia({ tokens, seleccion, valorDeToken, onLimpiar }) {
    const activo = tokens.find((token) => token.id === seleccion) || null;

    const paleta = useMemo(() => {
        const mapa = {};
        tokens.filter((token) => token.grupo === 'color').forEach((token) => {
            mapa[token.clave] = valorDeToken(token);
        });
        return mapa;
    }, [tokens, valorDeToken]);

    const tipos = useMemo(() => {
        const mapa = {};
        tokens.filter((token) => token.grupo === 'tipografia').forEach((token) => {
            const valor = valorDeToken(token);
            if (token.clave.startsWith('font.size.')) {
                mapa[token.clave.split('.').pop()] = aPx(valor);
            }
            if (token.clave.endsWith('display') || token.clave.endsWith('titles')) mapa.display = valor;
            if (token.clave.endsWith('sans') || token.clave.endsWith('body')) mapa.sans = valor;
        });
        return mapa;
    }, [tokens, valorDeToken]);

    const aplicacion = activo ? aplicacionDe(activo.clave, valorDeToken(activo)) : null;
    const resaltando = Boolean(activo && aplicacion && aplicacion.elementos.length > 0);

    return (
        <div style={{ height: '100%', overflow: 'auto', padding: 24, background: '#f5f5f5' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 14,
                    minHeight: 32,
                    flexWrap: 'wrap',
                }}
            >
                {resaltando ? (
                    <>
                        <Text style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>{activo.clave}</Text>
                        <Tag color='processing'>
                            {aplicacion.elementos.length === 1
                                ? '1 lugar'
                                : `${aplicacion.elementos.length} lugares`}
                        </Tag>
                        {aplicacion.nota && (
                            <Text type='secondary' style={{ fontSize: 13 }}>{aplicacion.nota}</Text>
                        )}
                        <span style={{ flexGrow: 1 }} />
                        <Button size='small' onClick={onLimpiar}>Ver todo</Button>
                    </>
                ) : (
                    <Text type='secondary' style={{ fontSize: 13 }}>
                        Elige un token de la izquierda para ver dónde se aplica.
                    </Text>
                )}
            </div>

            <Composicion
                paleta={paleta}
                tipos={tipos}
                aplicacion={aplicacion}
                activo={resaltando}
                demo={aplicacion ? aplicacion.demo : null}
            />
        </div>
    );
}
