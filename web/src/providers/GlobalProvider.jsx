import { useCallback, useMemo, useState, useEffect } from 'react';
import ReactGA from 'react-ga4';
import GlobalContext from '@contexts/GlobalContext';
import { getMenuItems } from '@services/menuService';
import { getLayoutByType } from '@services/layoutService';
import { getStyles } from '@services/styleService';
import { loadAllFonts, loadFontFamily } from '@services/fontService';

const GlobalProvider = ({ children }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [headerConfig, setHeaderConfig] = useState({
        logoUrl: '/logo_iieg.svg',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        title: null,
        showTitle: true,
        titleFont: null,
        titleFontWeight: null,
        titleColor: null,
        subtitle: null,
        showSubtitle: true,
        subtitleFont: null,
        subtitleFontWeight: null,
        subtitleColor: null,
        menuFont: null,
        menuFontWeight: null,
        showNavigationMenu: true
    });
    const [footerConfig, setFooterConfig] = useState({});
    const [globalStyles, setGlobalStyles] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadGlobalData = async () => {
            setLoading(true);
            try {
                const [items, header, footer, styles, fonts] = await Promise.all([
                    getMenuItems(),
                    getLayoutByType('header'),
                    getLayoutByType('footer'),
                    getStyles(),
                    loadAllFonts()
                ]);

                setMenuItems(items);

                if (header && Object.keys(header).length > 0) {
                    const config = {
                        logoUrl: header.logoUrl || '/logo_iieg.svg',
                        backgroundColor: header.backgroundColor || '#ffffff',
                        textColor: header.textColor || '#1f2937',
                        title: header.title || null,
                        showTitle: header.showTitle !== false,
                        titleFont: header.titleFont || null,
                        titleFontWeight: header.titleFontWeight || null,
                        titleColor: header.titleColor || null,
                        subtitle: header.subtitle || null,
                        showSubtitle: header.showSubtitle !== false,
                        subtitleFont: header.subtitleFont || null,
                        subtitleFontWeight: header.subtitleFontWeight || null,
                        subtitleColor: header.subtitleColor || null,
                        menuFont: header.menuFont || null,
                        menuFontWeight: header.menuFontWeight || null,
                        showNavigationMenu: header.showNavigationMenu !== false
                    };

                    if (config.titleFont && fonts.length > 0) {
                        loadFontFamily(config.titleFont, fonts);
                    }
                    if (config.subtitleFont && fonts.length > 0) {
                        loadFontFamily(config.subtitleFont, fonts);
                    }
                    if (config.menuFont && fonts.length > 0) {
                        loadFontFamily(config.menuFont, fonts);
                    }

                    setHeaderConfig(config);
                }

                if (footer && Object.keys(footer).length > 0) {
                    const footerConfigWithWeights = {
                        ...footer,
                        textFontWeight: footer.textFontWeight || null,
                        linkFontWeight: footer.linkFontWeight || null
                    };

                    if (footer.textFont && fonts.length > 0) {
                        loadFontFamily(footer.textFont, fonts);
                    }
                    if (footer.linkFont && fonts.length > 0) {
                        loadFontFamily(footer.linkFont, fonts);
                    }
                    setFooterConfig(footerConfigWithWeights);
                }

                if (styles && Object.keys(styles).length > 0) {
                    if (styles.typography) {
                        if (styles.typography.headingFont && fonts.length > 0) {
                            loadFontFamily(styles.typography.headingFont, fonts);
                        }
                        if (styles.typography.bodyFont && fonts.length > 0) {
                            loadFontFamily(styles.typography.bodyFont, fonts);
                        }
                        if (styles.typography.buttonFont && fonts.length > 0) {
                            loadFontFamily(styles.typography.buttonFont, fonts);
                        }
                    }
                    setGlobalStyles(styles);
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
        headerConfig,
        footerConfig,
        globalStyles,
        loading
    }), [
        GlobalAnalyticsEvent,
        menuItems,
        headerConfig,
        footerConfig,
        globalStyles,
        loading
    ]);

    return (
        <GlobalContext.Provider value={value}>
            {children}
        </GlobalContext.Provider>
    );
};

export default GlobalProvider;