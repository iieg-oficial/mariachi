import { useEffect, useState } from 'react';
import { catalogosApi } from '../services/formulariosAdminApi';

let cache = null;
let pending = null;
const subscribers = new Set();

const fetchCatalogos = () => {
    if (!pending) {
        pending = catalogosApi.get()
            .then((data) => {
                cache = data ?? {};
                return cache;
            })
            .catch((err) => {
                pending = null;
                throw err;
            });
    }
    return pending;
};

const notify = () => {
    for (const cb of subscribers) cb(cache);
};

export const invalidateCatalogos = () => {
    cache = null;
    pending = null;
    fetchCatalogos().then(notify).catch(() => {});
};

export default function useCatalogos() {
    const [catalogos, setCatalogos] = useState(cache);
    const [loading, setLoading] = useState(!cache);

    useEffect(() => {
        let cancelled = false;

        const update = (data) => {
            if (!cancelled && data) setCatalogos(data);
        };
        subscribers.add(update);

        if (!cache) {
            setLoading(true);
            fetchCatalogos()
                .then((data) => { if (!cancelled) setCatalogos(data); })
                .catch(() => { if (!cancelled) setCatalogos({}); })
                .finally(() => { if (!cancelled) setLoading(false); });
        }

        return () => {
            cancelled = true;
            subscribers.delete(update);
        };
    }, []);

    return { catalogos: catalogos ?? {}, loading };
}
