import { useCallback, useState } from 'react';
import { exportGrid } from '@shared/services/gridService';
import { triggerDownload } from '@shared/helpers/downloadFile';
import { message } from '@shared/services/message';

export default function useGridExport() {
    const [exporting, setExporting] = useState(null);

    const runExport = useCallback(async (resource, option, { workspace, search, fileName } = {}) => {
        const [formato, hoja] = option === 'xlsx' ? ['xlsx', null] : option.split('-');
        setExporting(option);
        try {
            const response = await exportGrid(resource, { formato, hoja, workspace, search });
            triggerDownload(response, `${fileName || resource}.${formato}`);
        } catch {
            message.error('No se pudo generar la descarga');
        } finally {
            setExporting(null);
        }
    }, []);

    return { exporting, runExport };
}
