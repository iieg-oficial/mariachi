import { createContext, useContext } from 'react';

export const FontConfigContext = createContext();

export const useFontConfig = () => {
    const context = useContext(FontConfigContext);
    if (!context) {
        throw new Error('useFontConfig must be used within FontConfigProvider');
    }
    return context;
};
