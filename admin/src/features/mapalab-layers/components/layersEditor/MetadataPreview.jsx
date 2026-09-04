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

export default function MetadataPreview({ form, layerKey, layerLabel, onAbrirSeccion, onIrAEstadisticas, numeralia = [], saving = false }) {
    const descripcion = Form.useWatch('descripcion', form);
    const frecuencia = Form.useWatch('frecuencia', form);
    const fechaUltima = Form.useWatch('fecha_ultima', form);
    const downloadable = Form.useWatch('downloadable', form);
    const fuentes = conTexto(Form.useWatch('fuentes', form), ['corto', 'largo', 'enlace']);
    const metodologia = conTexto(Form.useWatch('metodologia', form), ['texto', 'archivo_enlace']);
    const metadato = conTexto(Form.useWatch('metadato', form), ['nombre', 'enlace']);
    const tipoMapa = Form.useWatch('tipo_mapa', form);
    const textoLeyenda = Form.useWatch('texto_leyenda', form);

    const abrir = (id) => () => onAbrirSeccion?.(id);
    const indicadores = (numeralia || []).filter((n) => n?.nombre || n?.valor);

    return (
        <VisorFrame
            caption={saving
                ? 'Vista previa de detalles de la capa · guardando…'
                : 'Vista previa de detalles de la capa'}
        >
            <Tooltip title="El visor titula la ficha con el alias o el nombre de la capa en el árbol, no con un campo de metadatos. Se cambia en la pestaña Identidad.">
                <div className="ficha-titulo ficha-titulo-fijo">
                    {layerLabel || <Vacio>Sin nombre</Vacio>}
                </div>
            </Tooltip>

            {(frecuencia || fechaUltima) && (
                <div className="ficha-cards">
                    <button type="button" className="ficha-card" onClick={abrir('general')}>
                        <span className="h">Frecuencia de actualización</span>
                        <span className="v">{frecuencia || '—'}</span>
                    </button>
                    <button type="button" className="ficha-card" onClick={abrir('general')}>
                        <span className="h">Última actualización</span>
                        <span className="v">{fechaUltima || '—'}</span>
                    </button>
                </div>
            )}

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

            {(textoLeyenda || tipoMapa) && (
                <Seccion
                    titulo="Referencia cartográfica del límite municipal"
                    ayuda="Editar en Referencias cartográficas"
                    onClick={abrir('referencias')}
                >
                    {textoLeyenda && <span style={{ display: 'block' }}>{textoLeyenda}</span>}
                    {tipoMapa && <span style={{ display: 'block' }}><b>Tipo de mapa:</b> {tipoMapa}</span>}
                </Seccion>
            )}

            {metadato.length > 0 && (
                <Seccion titulo="Metadato" ayuda="Editar en Archivos adjuntos" onClick={abrir('adjuntos')}>
                    {metadato.map((m, i) => (
                        <span key={i} style={{ display: 'block' }}>
                            <u>{m.nombre || m.enlace}</u>
                        </span>
                    ))}
                </Seccion>
            )}

            <div className="ficha-meta">
                <span>Descarga: <b>{downloadable === false ? 'bloqueada' : 'disponible'}</b></span>
                {layerKey && <span>Feature type: <code>{layerKey}</code></span>}
            </div>
        </VisorFrame>
    );
}
