import { Segmented, Tooltip } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

export default function InfoBoxVisibilitySwitch({ value, onChange }) {
    return (
        <Segmented
            size="small"
            value={value === false ? 'oculta' : 'visible'}
            onChange={(v) => onChange?.(v === 'visible')}
            options={[
                {
                    value: 'visible',
                    icon: <EyeOutlined />,
                    label: <Tooltip title="El visor abre la tarjetita al hacer clic en esta capa">Visible</Tooltip>,
                },
                {
                    value: 'oculta',
                    icon: <EyeInvisibleOutlined />,
                    label: <Tooltip title="El visor no abre la tarjetita al hacer clic en esta capa">Oculta</Tooltip>,
                },
            ]}
        />
    );
}
