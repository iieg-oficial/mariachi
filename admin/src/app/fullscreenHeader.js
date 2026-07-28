import { createContext, useContext, useEffect } from 'react';

export const FullscreenHeaderContext = createContext({ setHeader: () => {} });

export function useFullscreenHeader({ title, backTo = null, extra = null }) {
    const { setHeader } = useContext(FullscreenHeaderContext);

    useEffect(() => {
        setHeader({ title, backTo, extra });
    }, [setHeader, title, backTo, extra]);
}

export default useFullscreenHeader;
