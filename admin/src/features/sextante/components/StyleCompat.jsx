import { Badge, Tooltip } from 'antd';
import { xmlError } from '@features/sextante/utils/xmlError';

const verdict = ({ xml, mapStatus, hasLayer, editable, reason }) => {
    const parseError = xmlError(xml);
    if (parseError) return { status: 'error', text: 'XML inválido', tip: parseError };
    if (!hasLayer) return { status: 'default', text: 'Sin capa para probar', tip: 'Ninguna capa lo usa: no hay dónde pintarlo.' };
    if (mapStatus === 'error') return { status: 'error', text: 'GeoServer lo rechaza', tip: 'GeoServer no pudo pintar la capa con este SLD.' };
    if (mapStatus !== 'ok') return { status: 'processing', text: 'Probando…', tip: 'Pintando la capa con este SLD.' };
    if (!editable) return { status: 'warning', text: 'Sin editor de colores', tip: reason || 'GeoServer lo pinta, pero solo se edita como XML.' };
    return { status: 'success', text: 'Compatible', tip: 'GeoServer lo pinta y el editor de colores lo entiende.' };
};

export default function StyleCompat(props) {
    const { status, text, tip } = verdict(props);
    return (
        <Tooltip title={tip}>
            <Badge status={status} text={text} style={{ whiteSpace: 'nowrap' }} />
        </Tooltip>
    );
}
