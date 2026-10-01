import { aFormData } from '../api/intranetService';

export const aPayload = ({ background_url: fondo, enlace, ...resto }) => aFormData({
    ...resto,
    background_url: fondo?.startsWith('/static/') ? undefined : fondo,
    enlace: enlace?.trim() || undefined,
    sin_enlace: enlace?.trim() ? undefined : 'true',
});
