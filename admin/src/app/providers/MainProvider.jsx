import { Outlet } from 'react-router';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import esES from 'antd/locale/es_ES';
import { BRAND } from '@app/providers/brand';

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
                        darkItemSelectedBg: '#4a6494',
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
            <AntApp style={{ minHeight: '100dvh' }}>
                <Outlet />
            </AntApp>
        </ConfigProvider>
    );
}
