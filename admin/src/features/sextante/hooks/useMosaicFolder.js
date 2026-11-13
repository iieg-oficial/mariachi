import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMosaicStatus, listMosaics } from '@features/sextante/api/mosaicService';
import { extOf, scopeFolderPath } from '@features/sextante/utils/geoserverFiles';

const RASTER_EXT = ['tif', 'tiff'];

export default function useMosaicFolder({ workspace, currentPath, files }) {
    const [mosaics, setMosaics] = useState([]);
    const [status, setStatus] = useState(null);
    const [version, setVersion] = useState(0);

    const path = scopeFolderPath(workspace, currentPath);

    useEffect(() => {
        let alive = true;
        listMosaics()
            .then((data) => { if (alive) setMosaics(data); })
            .catch(() => { if (alive) setMosaics([]); });
        return () => { alive = false; };
    }, [version]);

    const mosaic = useMemo(
        () => (path ? mosaics.find((m) => m.path === path) || null : null),
        [mosaics, path],
    );

    useEffect(() => {
        setStatus(null);
        if (!mosaic?.manageable) return undefined;
        let alive = true;
        getMosaicStatus({ workspace: mosaic.workspace, store: mosaic.store })
            .then((data) => { if (alive) setStatus(data); })
            .catch(() => { if (alive) setStatus(null); });
        return () => { alive = false; };
    }, [mosaic, version, files]);

    const hasRasters = useMemo(
        () => (files || []).some((f) => RASTER_EXT.includes(extOf(f.name || ''))),
        [files],
    );

    const canPublish = Boolean(workspace && currentPath && !mosaic && hasRasters);
    const refresh = useCallback(() => setVersion((v) => v + 1), []);

    return { path, mosaic, status, canPublish, refresh };
}
