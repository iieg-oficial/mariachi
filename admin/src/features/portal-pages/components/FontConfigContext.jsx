import { useState, useEffect, useCallback } from 'react';
import fontService from '@features/portal-pages/hooks/fontService';
import { FontConfigContext } from '@features/portal-pages/components/useFontConfig';

export const FontConfigProvider = ({ children }) => {
    const [fontFamilies, setFontFamilies] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadFonts = useCallback(async () => {
        try {
            const families = await fontService.getFontFamilies();
            setFontFamilies(families);
        } catch (error) {
            console.error('Error loading fonts:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        fontService.getFontFamilies()
            .then((families) => { if (!cancelled) setFontFamilies(families); })
            .catch((error) => console.error('Error loading fonts:', error))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const getWeightsForFamily = (familyName) => {
        const family = fontFamilies.find(f => f.family === familyName);
        if (!family) return [];

        return family.variants.map(v => ({
            value: `${v.weight}-${v.style}`,
            label: `${v.weight} - ${v.name} (${v.style})`,
            weight: v.weight,
            fontStyle: v.style
        }));
    };

    const value = {
        fontFamilies,
        loading,
        getWeightsForFamily,
        reloadFonts: loadFonts
    };

    return (
        <FontConfigContext.Provider value={value}>
            {children}
        </FontConfigContext.Provider>
    );
};
