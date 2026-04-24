import { Outlet } from 'react-router';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import esES from 'antd/locale/es_ES';

export const BRAND = {
    numeralia: '#2e4372',
    purple: '#5C2472',
    orange: '#FF8300'
};

export default function MainProvider() {
    return (
        <ConfigProvider
            locale={esES}
            theme={{
                algorithm: theme.defaultAlgorithm,
                token: {
                    colorPrimary: BRAND.numeralia,
                    colorLink: BRAND.numeralia,
                    colorInfo: BRAND.numeralia,
                    colorWarning: BRAND.orange,
                    colorError: '#d4380d',
                    borderRadius: 8,
                    fontFamily: '"Garet", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: 14
                },
                components: {
                    Layout: {
                        headerBg: '#ffffff',
                        siderBg: BRAND.numeralia,
                        triggerBg: BRAND.purple
                    },
                    Menu: {
                        darkItemBg: BRAND.numeralia,
                        darkItemSelectedBg: BRAND.purple,
                        darkSubMenuItemBg: '#25365b'
                    },
                    Button: {
                        primaryShadow: 'none'
                    },
                    Card: {
                        boxShadowTertiary: '0 1px 2px rgba(0,0,0,0.04)'
                    }
                }
            }}
        >
            <AntApp style={{ minHeight: '100vh' }}>
                <Outlet />
            </AntApp>
        </ConfigProvider>
    );
}
