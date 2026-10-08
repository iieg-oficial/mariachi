import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

const TituloConAyuda = ({ titulo, ayuda, ancho = 360 }) => {
    if (!ayuda) return titulo;

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {titulo}
            <Tooltip
                title={ayuda}
                trigger={['hover', 'focus']}
                styles={{ root: { maxWidth: ancho } }}
            >
                <InfoCircleOutlined
                    tabIndex={0}
                    aria-label={`Qué significa: ${titulo}`}
                    style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 13, cursor: 'help' }}
                />
            </Tooltip>
        </span>
    );
};

export default TituloConAyuda;
