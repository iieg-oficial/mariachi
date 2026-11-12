import { useCallback, useEffect, useState } from 'react';
import { message } from '@shared/services/message';
import { batchErrorMessage } from '@features/sextante/api/stylesBatchService';

export default function useDraftItems(load) {
    const [items, setItems] = useState(null);

    const reload = useCallback(() => load()
        .then(setItems)
        .catch((err) => {
            setItems([]);
            message.error(batchErrorMessage(err, 'No se pudo cargar la lista'));
        }), [load]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { items, reload };
}
