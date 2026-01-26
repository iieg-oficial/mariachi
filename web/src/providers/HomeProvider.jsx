import { useCallback, useMemo } from 'react';
import ReactGA from 'react-ga4';
import HomeContext from '@contexts/HomeContext';

const HomeProvider = ({ children }) => {

    const HomeAnalyticsEvent = useCallback((action, label) => {
        ReactGA.event({ category: 'Home', action, label });
    }, []);

    const value = useMemo(() => ({
        HomeAnalyticsEvent
    }), [
        HomeAnalyticsEvent
    ]);

    return (
        <HomeContext.Provider value={value}>
            {children}
        </HomeContext.Provider>
    );
};

export default HomeProvider;