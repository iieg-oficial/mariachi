import { Button, Tooltip } from 'antd';

import { esAnio } from './formatoCampo';

export default function FormatoAnioToggle({ item, onChange, size }) {
    const activo = esAnio(item);
    return (
        <Tooltip title="Muestra solo el año de la fecha (2026-01-01 → 2026)">
            <Button size={size} type={activo ? 'primary' : 'default'} onClick={() => onChange(!activo)}>
                año
            </Button>
        </Tooltip>
    );
}
