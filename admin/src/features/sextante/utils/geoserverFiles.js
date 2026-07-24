export const PREVIEWABLE_EXT = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif'];
export const FOLDER_NAME_RE = /^[a-zA-Z0-9._-]+$/;
export const WORKSPACE_STORAGE_KEY = 'mapalab.geoserverFiles.workspace';
export const SEARCH_DEBOUNCE_MS = 350;

export const extOf = (name) => (name.split('.').pop() || '').toLowerCase();
export const isPreviewable = (name) => PREVIEWABLE_EXT.includes(extOf(name));
export const basename = (path) => path.split('/').filter(Boolean).pop() || '';
export const workspaceLabel = (ws) => (ws ? `workspaces/${ws}/styles/` : 'styles/');
