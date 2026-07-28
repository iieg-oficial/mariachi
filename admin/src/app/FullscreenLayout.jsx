import { useCallback, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { Button, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { FullscreenHeaderContext } from '@app/fullscreenHeader';
import useIsMobile from '@shared/hooks/useIsMobile';

const { Text } = Typography;

const TOPBAR_STYLES = `
    .mariachi-topbar .ant-btn.ant-btn-variant-text {
        color: rgba(255, 255, 255, 0.85);
    }
    .mariachi-topbar .ant-btn.ant-btn-variant-text:not(:disabled):hover {
        background: rgba(255, 255, 255, 0.14);
        color: #fff;
    }
    .mariachi-topbar .ant-btn.ant-btn-variant-text:disabled {
        color: rgba(255, 255, 255, 0.3);
        background: transparent;
    }
    .mariachi-topbar .ant-btn.ant-btn-variant-outlined {
        background: rgba(255, 255, 255, 0.14);
        border-color: rgba(255, 255, 255, 0.28);
        color: #fff;
    }
    .mariachi-topbar .ant-btn.ant-btn-variant-outlined:not(:disabled):hover {
        background: rgba(255, 255, 255, 0.24);
        border-color: rgba(255, 255, 255, 0.44);
        color: #fff;
    }
    .mariachi-topbar .ant-btn.ant-btn-variant-outlined:disabled {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.14);
        color: rgba(255, 255, 255, 0.3);
    }
    .mariachi-topbar .ant-btn.ant-btn-variant-solid:disabled {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.16);
        color: rgba(255, 255, 255, 0.38);
    }
`;

export default function FullscreenLayout() {
    const navigate = useNavigate();
    const { isDesktop } = useIsMobile();
    const [header, setHeader] = useState({ title: '', backTo: null, extra: null });

    const contextValue = useMemo(() => ({ setHeader }), []);

    const body = useMemo(() => <Outlet />, []);

    const handleBack = useCallback(() => {
        if (header.backTo) navigate(header.backTo);
        else navigate(-1);
    }, [navigate, header.backTo]);

    return (
        <FullscreenHeaderContext.Provider value={contextValue}>
            <style>{TOPBAR_STYLES}</style>
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div
                    className="mariachi-topbar"
                    style={{
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: isDesktop ? 'row' : 'column',
                        alignItems: isDesktop ? 'center' : 'stretch',
                        justifyContent: 'space-between',
                        flexWrap: 'nowrap',
                        gap: isDesktop ? 12 : 6,
                        padding: isDesktop ? '0 12px' : '8px 10px',
                        height: isDesktop ? 52 : 'auto',
                        background: '#001529',
                        color: '#fff',
                    }}
                >
                    <Space size={8} align="center" style={{ minWidth: 0, flex: isDesktop ? '1 1 auto' : 'none' }}>
                        <img
                            src={`${import.meta.env.BASE_URL}iieg-favicon-192.png`}
                            alt="IIEG"
                            style={{ height: 26, width: 'auto', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 15, fontWeight: 'bold', letterSpacing: 0.5, color: '#fff' }}>
                            Mariachi
                        </span>
                        <Button
                            type="text"
                            size="small"
                            icon={<ArrowLeftOutlined />}
                            onClick={handleBack}
                            aria-label="Regresar"
                            title="Regresar"
                        />
                        <Text
                            style={{
                                color: '#fff',
                                fontSize: isDesktop ? 14 : 13,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {header.title}
                        </Text>
                    </Space>
                    {header.extra && (
                        <div
                            style={{
                                display: 'flex',
                                flexShrink: 0,
                                justifyContent: isDesktop ? 'flex-end' : 'flex-start',
                                overflowX: isDesktop ? 'visible' : 'auto',
                            }}
                        >
                            {header.extra}
                        </div>
                    )}
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {body}
                </div>
            </div>
        </FullscreenHeaderContext.Provider>
    );
}
