import { useCallback, useMemo, useState, useEffect } from 'react';
import ReactGA from 'react-ga4';
import GlobalContext from '@contexts/GlobalContext';
import { getMenuItems, getPreviewMenu } from '@services/menuService';

const GlobalProvider = ({ children }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMenuPreview, setIsMenuPreview] = useState(false);

    useEffect(() => {
        const loadGlobalData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams(window.location.search);
                const menuPreviewToken = params.get('menu-preview');

                if (menuPreviewToken) {
                    const previewItems = await getPreviewMenu(menuPreviewToken);
                    if (previewItems) {
                        setMenuItems(previewItems);
                        setIsMenuPreview(true);
                    } else {
                        setMenuItems(await getMenuItems());
                    }
                } else {
                    setMenuItems(await getMenuItems());
                }
            } catch (error) {
                console.error('Error loading global data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadGlobalData();
    }, []);

    const GlobalAnalyticsEvent = useCallback((action, label) => {
        ReactGA.event({ category: 'Global', action, label });
    }, []);

    const value = useMemo(() => ({
        GlobalAnalyticsEvent,
        navigation: { menuItems },
        loading,
        isMenuPreview
    }), [GlobalAnalyticsEvent, menuItems, loading, isMenuPreview]);

    return (
        <GlobalContext.Provider value={value}>
            {children}
        </GlobalContext.Provider>
    );
};

export default GlobalProvider;
