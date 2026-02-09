import { Tooltip } from 'antd';

const DISABLED_MESSAGE = 'Funcionalidad no disponible hasta versión de portal 2.0';

export default function DisabledFeature({ children, message = DISABLED_MESSAGE }) {
    return (
        <Tooltip title={message} placement="top">
            <span style={{ cursor: 'not-allowed' }}>
                {children}
            </span>
        </Tooltip>
    );
}
