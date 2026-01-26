import { createContext, useContext, useState, useEffect } from 'react';
import fontService from '@services/fontService';

const FontConfigContext = createContext();

export const FontConfigProvider = ({ children }) => {
    const [fontFamilies, setFontFamilies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFonts();
    }, []);

    const loadFonts = async () => {
        try {
            setLoading(true);
            const families = await fontService.getFontFamilies();
            setFontFamilies(families);
        } catch (error) {
            console.error('Error loading fonts:', error);
        } finally {
            setLoading(false);
        }
    };

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

export const useFontConfig = () => {
    const context = useContext(FontConfigContext);
    if (!context) {
        throw new Error('useFontConfig must be used within FontConfigProvider');
    }
    return context;
};

export default FontConfigContext;
