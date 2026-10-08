import { Tooltip } from 'antd';
import { SafetyCertificateFilled, WarningFilled } from '@ant-design/icons';
import { pendientesDe } from '../helpers/estadoCuenta';

export default function EstadoCuenta({ user, detalleVisible = true }) {
    const pendientes = pendientesDe(user, detalleVisible);
    const alDia = pendientes.length === 0;

    const titulo = alDia ? 'Cuenta al día' : (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
            {pendientes.map((p) => <li key={p}>{p}</li>)}
        </ul>
    );

    const etiqueta = alDia
        ? 'Cuenta al día'
        : `${pendientes.length} pendiente(s) de la cuenta: ${pendientes.join('; ')}`;

    const Icono = alDia ? SafetyCertificateFilled : WarningFilled;

    return (
        <Tooltip title={titulo}>
            <span role="img" aria-label={etiqueta} style={{ display: 'inline-flex' }}>
                <Icono style={{ fontSize: 16, color: alDia ? '#389E0D' : '#D48806' }} />
            </span>
        </Tooltip>
    );
}
