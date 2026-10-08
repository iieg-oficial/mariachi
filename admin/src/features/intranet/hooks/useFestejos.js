import { useEffect, useState } from 'react';

import { listar } from '../api/intranetService';

export const useFestejos = () => {
    const [festejos, setFestejos] = useState([]);
    useEffect(() => {
        let vigente = true;
        listar('festejos')
            .then((lista) => { if (vigente) setFestejos(lista); })
            .catch(() => { if (vigente) setFestejos([]); });
        return () => { vigente = false; };
    }, []);
    return festejos;
};
