import { Outlet } from 'react-router';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';


export default function MainProvider() {
    return (
        <ConfigProvider
            locale={esES}
            theme={{
                token: {
                    colorPrimary: '#1890ff',
                    borderRadius: 6,
                },
            }}
        >
            <div style={{ minHeight: '100vh' }}>
                <Outlet />
            </div>
        </ConfigProvider>
    );
}
