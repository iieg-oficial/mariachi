import { useMemo } from 'react';
import { Button, Modal, Segmented, Tooltip, Typography } from 'antd';
import Composicion from '@features/mel/components/previews/Composicion';
import { ELEMENTOS_CON_NOMBRE, aplicacionDe } from '@features/mel/helpers/aplicacion';
import {
    DISPOSITIVOS,
    POR_DEFECTO,
    anchoDe,
    dispositivoDe,
    vaEnModal,
} from '@features/mel/constants/dispositivos';

const { Text } = Typography;

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const aPx = (valor) => {
    const texto = String(valor ?? '').trim();
    if (texto.endsWith('rem')) return Math.round(parseFloat(texto) * 16);
    if (texto.endsWith('px')) return Math.round(parseFloat(texto));
    return null;
};

const OPCIONES = DISPOSITIVOS.map((d) => ({
    value: d.id,
    label: (
        <Tooltip title={`${d.id} · ${d.ancho} px${d.enModal ? ' · se abre aparte' : ''}`}>
            <span>{d.nombre}</span>
        </Tooltip>
    ),
}));

export default function VistaPrevia({
    tokens,
    campos,
    seleccion,
    valorDeToken,
    onLimpiar,
    elemento,
    onElemento,
    anclado,
    editor,
    onCerrar,
    dispositivo,
    onDispositivo,
}) {
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
            const escalon = token.clave.split('.').pop();
            if (token.clave.startsWith('font.size.')) mapa[escalon] = aPx(valor);
            if (token.clave.startsWith('font.weight.')) mapa[escalon] = Number(valor) || undefined;
            if (token.clave.startsWith('leading.')) mapa[escalon] = Number(valor) || undefined;
            if (token.clave.startsWith('font.family.')) {
                if (escalon === 'display' || escalon === 'titles') mapa.display = valor;
                else if (!mapa.sans) mapa.sans = valor;
            }
        });
        return mapa;
    }, [tokens, valorDeToken]);

    const aplicacion = activo ? aplicacionDe(activo.clave, valorDeToken(activo)) : null;
    const apagando = Boolean(activo && aplicacion && aplicacion.elementos.length > 0);
    const resaltando = Boolean(activo && aplicacion && (apagando || aplicacion.demo));

    const enModal = vaEnModal(dispositivo);
    const anchoEnLinea = enModal ? anchoDe(POR_DEFECTO) : anchoDe(dispositivo);
    const elegido = dispositivoDe(dispositivo);

    const pieza = (ancho) => (
        <Composicion
            paleta={paleta}
            tipos={tipos}
            campos={campos}
            aplicacion={aplicacion}
            activo={apagando}
            demo={aplicacion ? aplicacion.demo : null}
            onElemento={onElemento}
            anclado={anclado}
            editor={editor}
            onCerrar={onCerrar}
            ancho={ancho}
        />
    );

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
                        {aplicacion.nota && (
                            <Text type='secondary' style={{ fontSize: 13 }}>{aplicacion.nota}</Text>
                        )}
                    </>
                ) : (
                    <Text type='secondary' style={{ fontSize: 13 }}>
                        {elemento
                            ? `Estás sobre ${ELEMENTOS_CON_NOMBRE[elemento] || elemento}. Sus tokens están marcados a la izquierda.`
                            : 'Elige un token de la izquierda, o pasa por la pieza para ver qué la compone.'}
                    </Text>
                )}
                <span style={{ flexGrow: 1 }} />
                <Segmented size='small' value={dispositivo} onChange={onDispositivo} options={OPCIONES} />
                <Button size='small' disabled={!resaltando} onClick={onLimpiar}>Ver todo</Button>
            </div>

            {pieza(anchoEnLinea)}

            <Modal
                open={enModal}
                onCancel={() => onDispositivo(POR_DEFECTO)}
                footer={null}
                width={elegido ? elegido.ancho + 64 : 1088}
                style={{ top: 24 }}
                title={elegido ? `${elegido.nombre} · ${elegido.ancho} px` : ''}
            >
                <div style={{ maxHeight: '78vh', overflow: 'auto' }}>
                    {enModal && pieza(elegido.ancho)}
                </div>
            </Modal>
        </div>
    );
}
