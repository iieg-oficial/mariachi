export const PREVIEWABLE_EXT = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif'];
export const IMAGE_EXT = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'tif'];
export const FONT_EXT = ['ttf', 'otf'];
export const CONFIG_EXT = ['properties'];
export const UPLOADABLE_EXT = [...IMAGE_EXT, ...FONT_EXT, ...CONFIG_EXT];
export const RASTER_ROOT = 'geoserver-raster';
export const RASTER_SCOPE = '__rasters__';
export const FOLDER_NAME_RE = /^[a-zA-Z0-9._-]+$/;
export const WORKSPACE_STORAGE_KEY = 'mapalab.geoserverFiles.workspace';
export const SEARCH_DEBOUNCE_MS = 350;

export const extOf = (name) => (name.split('.').pop() || '').toLowerCase();
export const isPreviewable = (name) => PREVIEWABLE_EXT.includes(extOf(name));

export const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / 1024 ** i) * 10) / 10} ${units[i]}`;
};
export const basename = (path) => path.split('/').filter(Boolean).pop() || '';
export const workspaceLabel = (ws) => {
    if (ws === RASTER_SCOPE) return `${RASTER_ROOT}/`;
    return ws ? `workspaces/${ws}/` : 'styles/';
};
