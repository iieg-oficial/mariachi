import { Form, Tooltip } from 'antd';
import VisorFrame from '@features/mapalab-layers/components/layersEditor/VisorFrame';

const Vacio = ({ children }) => <span className="ficha-vacio">{children}</span>;

const conTexto = (lista, campos) => (lista || []).filter(
    (item) => item && campos.some((c) => String(item[c] || '').trim()),
);

function Seccion({ titulo, ayuda, onClick, children }) {
    return (
        <Tooltip title={ayuda}>
            <button type="button" className="ficha-sec" onClick={onClick}>
                <span className="h">{titulo}</span>
                <span className="b">{children}</span>
            </button>
        </Tooltip>
    );
}

export default function MetadataPreview({ form, layerKey, onAbrirSeccion, onIrAEstadisticas, numeralia = [], saving = false }) {
    const nombre = Form.useWatch('layer_name_usuario', form);
    const descripcion = Form.useWatch('descripcion', form);
    const frecuencia = Form.useWatch('frecuencia', form);
    const fechaUltima = Form.useWatch('fecha_ultima', form);
    const downloadable = Form.useWatch('downloadable', form);
    const fuentes = conTexto(Form.useWatch('fuentes', form), ['corto', 'largo', 'enlace']);
    const metodologia = conTexto(Form.useWatch('metodologia', form), ['texto', 'archivo_enlace']);
    const metadato = conTexto(Form.useWatch('metadato', form), ['texto', 'archivo_enlace']);

    const abrir = (id) => () => onAbrirSeccion?.(id);
    const indicadores = (numeralia || []).filter((n) => n?.nombre || n?.valor);

    return (
        <VisorFrame
            caption={saving ? 'Ficha que abre el visor · guardando…' : 'Ficha que abre el visor'}
            note="En el mismo orden que el visor. Da click en una sección para editarla; las vacías no se muestran."
        >
            <Tooltip title="Se toma de «Nombre para el usuario», en Información general">
                <button type="button" className="ficha-titulo" onClick={abrir('general')}>
                    {nombre || <Vacio>Sin nombre para el usuario</Vacio>}
                </button>
            </Tooltip>

            <Seccion titulo="Descripción" ayuda="Editar en Información general" onClick={abrir('general')}>
                {descripcion || <Vacio>Sin descripción: la ficha abre casi vacía.</Vacio>}
            </Seccion>

            <Seccion
                titulo="Numeralia"
                ayuda="Se configura en la pestaña Estadísticas"
                onClick={onIrAEstadisticas}
            >
                {indicadores.length > 0 ? (
                    <span className="ficha-numeralia">
                        {indicadores.slice(0, 4).map((n, i) => (
                            <span key={i} className="ficha-num">
                                <b>{n.valor ?? '—'}</b>
                                <em>{n.nombre || `Indicador ${i + 1}`}</em>
                            </span>
                        ))}
                    </span>
                ) : (
                    <Vacio>Sin indicadores. Se configuran en la pestaña Estadísticas.</Vacio>
                )}
            </Seccion>

            {fuentes.length > 0 && (
                <Seccion
                    titulo={fuentes.length > 1 ? 'Fuentes' : 'Fuente'}
                    ayuda="Editar en Fuentes"
                    onClick={abrir('fuentes')}
                >
                    {fuentes.map((f, i) => (
                        <span key={i} style={{ display: 'block' }}>
                            {f.largo || f.corto || 'Fuente'}
                            {f.enlace && <> · <u>{f.enlace_label || (fuentes.length > 1 ? `Fuente ${i + 1}` : 'Ver fuente')}</u></>}
                        </span>
                    ))}
                </Seccion>
            )}

            {metodologia.length > 0 && (
                <Seccion
                    titulo={metodologia.length > 1 ? 'Metodologías' : 'Metodología'}
                    ayuda="Editar en Metodología"
                    onClick={abrir('metodologia')}
                >
                    {metodologia.map((m, i) => (
                        <span key={i} style={{ display: 'block' }}>
                            {m.texto}
                            {m.archivo_enlace && <> · <u>Documento</u></>}
                        </span>
                    ))}
                </Seccion>
            )}

            {metadato.length > 0 && (
                <Seccion titulo="Metadato" ayuda="Editar en Referencias cartográficas" onClick={abrir('referencias')}>
                    {metadato.map((m, i) => (
                        <span key={i} style={{ display: 'block' }}>
                            {m.texto}
                            {m.archivo_enlace && <> · <u>Documento</u></>}
                        </span>
                    ))}
                </Seccion>
            )}

            <div className="ficha-meta">
                <span>Frecuencia: <b>{frecuencia || '—'}</b></span>
                <span>Última actualización: <b>{fechaUltima || '—'}</b></span>
                <span>Descarga: <b>{downloadable === false ? 'bloqueada' : 'disponible'}</b></span>
                {layerKey && <span>Feature type: <code>{layerKey}</code></span>}
            </div>
        </VisorFrame>
    );
}
