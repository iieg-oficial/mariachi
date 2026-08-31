import { Segmented } from 'antd';
import { AppstoreOutlined, CodeOutlined, FileTextOutlined, LayoutOutlined } from '@ant-design/icons';

export default function InfoBoxModeSwitch({ value, onChange }) {
    return (
        <Segmented
            size="small"
            value={value}
            onChange={onChange}
            options={[
                { value: 'lienzo', label: 'Lienzo', icon: <LayoutOutlined /> },
                { value: 'visual', label: 'Lista', icon: <AppstoreOutlined /> },
                { value: 'texto', label: 'Texto', icon: <FileTextOutlined /> },
                { value: 'json', label: 'JSON', icon: <CodeOutlined /> },
            ]}
        />
    );
}
