import { Segmented } from 'antd';
import { AppstoreOutlined, CodeOutlined } from '@ant-design/icons';

export default function InfoBoxModeSwitch({ value, onChange }) {
    return (
        <Segmented
            size="small"
            value={value}
            onChange={onChange}
            options={[
                { value: 'visual', label: 'Visual', icon: <AppstoreOutlined /> },
                { value: 'json', label: 'JSON', icon: <CodeOutlined /> },
            ]}
        />
    );
}
