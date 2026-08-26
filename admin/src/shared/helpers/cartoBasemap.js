const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || '';

const BASE_URL = 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

export const CARTO_ATTRIBUTIONS = '© OpenStreetMap, © CARTO';

export const cartoBasemapUrl = () =>
    (CARTO_API_KEY ? `${BASE_URL}?key=${encodeURIComponent(CARTO_API_KEY)}` : BASE_URL);
