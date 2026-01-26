import { Input, Button, Space } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const StyledInput = ({
    value,
    onChange,
    onConfigClick,
    placeholder,
    hasConfig = false,
    configIcon = <SettingOutlined />,
    configTooltip = "Configurar estilos",
    ...inputProps
}) => {
    return (
        <Space.Compact style={{ width: '100%' }}>
            <Input
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                {...inputProps}
            />
            {hasConfig && (
                <Button
                    icon={configIcon}
                    onClick={onConfigClick}
                    title={configTooltip}
                    type={value ? 'primary' : 'default'}
                />
            )}
        </Space.Compact>
    );
};

export default StyledInput;
