import { useCallback, useMemo, useState, useEffect } from 'react';
import ReactGA from 'react-ga4';
import GlobalContext from '@contexts/GlobalContext';
import { getMenuItems } from '@services/menuService';

const GlobalProvider = ({ children }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadGlobalData = async () => {
            setLoading(true);
            try {
                const items = await getMenuItems();
                setMenuItems(items);
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
        loading
    }), [
        GlobalAnalyticsEvent,
        menuItems,
        loading
    ]);

    return (
        <GlobalContext.Provider value={value}>
            {children}
        </GlobalContext.Provider>
    );
};

export default GlobalProvider;
