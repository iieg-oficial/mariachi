import { useContext } from 'react';
import GlobalContext from '@contexts/GlobalContext';

export const useGlobal = () => {
    const context = useContext(GlobalContext);
    
    if (!context) {
        throw new Error('useGlobal debe usarse dentro de GlobalProvider');
    }
    
    return context;
};

export default useGlobal;
