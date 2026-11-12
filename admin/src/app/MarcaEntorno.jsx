import { Tooltip } from 'antd';
import { esEntornoTesting } from '@app/sider-alcance';

const AMBAR = '#faad14';

const DESCRIPCION = 'Espejo en Proxmox: datos copiados de producción.';

const ENLACE = { color: AMBAR, fontWeight: 600 };

const PILDORA = {
    background: AMBAR,
    color: '#1f1f1f',
    borderRadius: 999,
    padding: '0 8px',
    fontSize: 11,
    fontWeight: 600,
    lineHeight: '18px',
    letterSpacing: 0.3,
    flexShrink: 0,
};

const PUNTO = {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: 999,
    background: AMBAR,
    flexShrink: 0,
};

export default function MarcaEntorno({ compact = false }) {
    if (!esEntornoTesting()) return null;
    const produccion = import.meta.env.VITE_PRODUCCION_URL;
    const titulo = (
        <span>
            {DESCRIPCION}
            {produccion && (
                <>
                    <br />
                    <a href={produccion} target="_blank" rel="noreferrer" style={ENLACE}>Ir a producción</a>
                </>
            )}
        </span>
    );
    return (
        <Tooltip title={titulo}>
            {compact
                ? <span style={PUNTO} role="img" aria-label="Testing" />
                : <span style={PILDORA}>Testing</span>}
        </Tooltip>
    );
}
