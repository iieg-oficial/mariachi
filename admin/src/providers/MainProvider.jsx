import { Outlet } from 'react-router';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { NotificationProvider } from '@contexts/NotificationContext';

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
            <NotificationProvider>
                <div style={{ minHeight: '100vh' }}>
                    <Outlet />
                </div>
            </NotificationProvider>
        </ConfigProvider>
    );
}
