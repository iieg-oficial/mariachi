import api from '@shared/services/api';

const DB_NAME = 'Mariachi_AcervoStorage';
const DB_VERSION = 1;
const STORE_NAME = 'acervo_files';

let dbInstance = null;

const initDB = () => {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Error al abrir IndexedDB'));
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

const saveToIndexedDB = async (id, file) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.put({ id, file, timestamp: Date.now() });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Error al guardar en IndexedDB'));
        });
    } catch (error) {
        console.error('Error en IndexedDB:', error);
        throw error;
    }
};

const deleteFromIndexedDB = async (id) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Error al eliminar de IndexedDB'));
        });
    } catch (error) {
        console.error('Error en IndexedDB:', error);
        throw error;
    }
};


export const getBuckets = async () => {
    try {
        const response = await api.get('/acervo-buckets');
        return response.data;
    } catch (error) {
        console.error('Error fetching buckets:', error);
        throw error;
    }
};

export const getAllBuckets = async () => {
    try {
        const response = await api.get('/acervo-buckets', {
            params: { include_inactive: true },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching all buckets:', error);
        throw error;
    }
};

export const createBucket = async (payload) => {
    try {
        const response = await api.post('/acervo-buckets', payload);
        return response.data;
    } catch (error) {
        console.error('Error creating bucket:', error);
        throw error;
    }
};

export const updateBucket = async (id, payload) => {
    try {
        const response = await api.patch(`/acervo-buckets/${id}`, payload);
        return response.data;
    } catch (error) {
        console.error('Error updating bucket:', error);
        throw error;
    }
};

export const listBucketObjects = async (bucketId, prefix = '') => {
    try {
        const params = new URLSearchParams({ bucket_id: String(bucketId) });
        if (prefix) params.append('prefix', prefix);
        const response = await api.get(`/acervo/objetos-bucket?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error listing bucket objects:', error);
        throw error;
    }
};

export const ACERVO_PAGE_SIZE = 100;

const EMPTY_PAGE = { items: [], total: 0, limit: ACERVO_PAGE_SIZE, offset: 0, hasMore: false };

export const getAcervoFiles = async (filters = {}) => {
    try {
        if (!filters.bucketId) {
            return EMPTY_PAGE;
        }
        const params = new URLSearchParams({ bucket_id: String(filters.bucketId) });

        if (filters.folder) params.append('folder', filters.folder);
        if (filters.type) params.append('type', filters.type);
        if (filters.search) params.append('search', filters.search);
        if (filters.recursive !== undefined) params.append('recursive', String(filters.recursive));
        params.append('limit', String(filters.limit || ACERVO_PAGE_SIZE));
        params.append('offset', String(filters.offset || 0));

        const response = await api.get(`/acervo?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching media files:', error);
        throw error;
    }
};

export const uploadAcervoFile = async (file, options = {}) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        if (!options.bucketId) {
            throw new Error('bucketId requerido para subir archivos');
        }
        formData.append('bucket_id', String(options.bucketId));

        if (options.folder) {
            formData.append('folder', options.folder);
        }

        if (options.alt) {
            formData.append('alt', options.alt);
        }

        if (options.useUuid) {
            formData.append('use_uuid', 'true');
        }

        if (options.onConflict) {
            formData.append('on_conflict', options.onConflict);
        }

        const timeout = Math.max(300000, Math.ceil((file.size || 0) / 1024) * 2);

        const response = await api.post('/acervo', formData, {
            timeout,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (options.onProgress) {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    options.onProgress(percentCompleted);
                }
            }
        });

        if (response.data && response.data.id) {
            await saveToIndexedDB(response.data.id, file);
        }

        return response.data;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

export const uploadMultipleFiles = async (files, options = {}) => {
    try {
        const uploadPromises = files.map(file =>
            uploadAcervoFile(file, {
                ...options,
                onProgress: (percent) => {
                    if (options.onProgress) {
                        options.onProgress(file.name, percent);
                    }
                }
            })
        );

        const results = await Promise.allSettled(uploadPromises);

        const successful = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);

        const failed = results
            .filter(r => r.status === 'rejected')
            .map(r => r.reason);

        return { successful, failed };
    } catch (error) {
        console.error('Error uploading multiple files:', error);
        throw error;
    }
};

export const updateAcervoFile = async (id, updates) => {
    try {
        const response = await api.put(`/acervo/${id}`, updates);
        return response.data;
    } catch (error) {
        console.error('Error updating media file:', error);
        throw error;
    }
};

export const deleteAcervoFile = async (id) => {
    try {
        await api.delete(`/acervo/${id}`);

        await deleteFromIndexedDB(id);

        return true;
    } catch (error) {
        console.error('Error deleting media file:', error);
        throw error;
    }
};

export const buildFolderZipUrl = (bucketId, prefix = '') => {
    const cleaned = (prefix || '').replace(/^\/+|\/+$/g, '');
    const qs = cleaned ? `?prefix=${encodeURIComponent(cleaned)}` : '';
    return `${api.defaults.baseURL}/acervo/carpetas/${bucketId}/zip${qs}`;
};

export const deleteMultipleFiles = async (ids) => {
    try {
        const deletePromises = ids.map(id => deleteAcervoFile(id));
        await Promise.all(deletePromises);
        return true;
    } catch (error) {
        console.error('Error deleting multiple files:', error);
        throw error;
    }
};


export const getFolders = async (bucketId) => {
    try {
        if (!bucketId) return [];
        const params = new URLSearchParams({ bucket_id: String(bucketId) });
        const response = await api.get(`/acervo/carpetas?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching folders:', error);
        throw error;
    }
};

export const createFolder = async (bucketId, name, parent = null) => {
    try {
        const response = await api.post('/acervo/carpetas', { bucket_id: bucketId, name, parent });
        return response.data;
    } catch (error) {
        console.error('Error creating folder:', error);
        throw error;
    }
};

export const deleteFolder = async (id) => {
    try {
        await api.delete(`/acervo/carpetas/${id}`);
        return true;
    } catch (error) {
        console.error('Error deleting folder:', error);
        throw error;
    }
};

export const moveAcervoFile = async (id, folder) => {
    try {
        const response = await api.post('/acervo/mover', { id: String(id), folder: folder || '' });
        return response.data;
    } catch (error) {
        console.error('Error moving file:', error);
        throw error;
    }
};

export const moveMultipleFiles = async (ids, folder) => {
    try {
        const response = await api.post('/acervo/mover-lote', {
            ids: ids.map(String),
            folder: folder || '',
        });
        return response.data;
    } catch (error) {
        console.error('Error moving multiple files:', error);
        throw error;
    }
};

export const getAcervoResumen = async (bucketId = null) => {
    try {
        const query = bucketId ? `?bucket_id=${bucketId}` : '';
        const response = await api.get(`/acervo/resumen${query}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching acervo summary:', error);
        throw error;
    }
};

export const getFolderInfo = async (bucketId, prefix) => {
    try {
        const params = new URLSearchParams({ prefix: prefix || '' });
        const response = await api.get(`/acervo/carpetas/${bucketId}/info?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching folder info:', error);
        throw error;
    }
};


export const initChunkedUpload = async (fileName, fileType, fileSize, options) => {
    const totalChunks = Math.ceil(fileSize / (50 * 1024 * 1024));
    const formData = new FormData();
    formData.append('original_name', fileName);
    formData.append('content_type', fileType || 'application/octet-stream');
    formData.append('bucket_id', String(options.bucketId));
    formData.append('folder', options.folder || '/');
    formData.append('alt', options.alt || '');
    formData.append('total_size', String(fileSize));
    formData.append('total_chunks', String(totalChunks));
    if (options.useUuid) {
        formData.append('use_uuid', 'true');
    }
    if (options.onConflict) {
        formData.append('on_conflict', options.onConflict);
    }

    const response = await api.post('/acervo/chunked/init', formData, {
        timeout: 30000,
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const uploadChunk = async (sessionId, partNumber, chunkBlob) => {
    const formData = new FormData();
    formData.append('part_number', String(partNumber));
    formData.append('chunk', chunkBlob, `chunk.${partNumber}`);

    const timeout = Math.max(120000, Math.ceil((chunkBlob.size || 0) / 1024) * 2);
    const response = await api.post(`/acervo/chunked/${sessionId}/part`, formData, {
        timeout,
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const completeChunkedUpload = async (sessionId) => {
    const response = await api.post(`/acervo/chunked/${sessionId}/complete`, null, {
        timeout: 60000,
    });
    return response.data;
};

const ACERVO_PUBLIC_BASE = (import.meta.env.VITE_ACERVO_PUBLIC_URL || '').replace(/\/+$/, '');

export const toPublicUrl = (url) => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    const base = ACERVO_PUBLIC_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
    if (!base) return url;
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Deriva una variante de la miniatura con otro ancho a partir del `thumbnail`
// serializado (que ya trae `?w=400`). Para SVG/no-imagen (sin `?w=`) o sin
// thumbnail, devuelve la miniatura tal cual.
export const thumbVariant = (file, width) => {
    const thumb = file?.thumbnail;
    if (!thumb) return file?.url;
    return /[?&]w=\d+/.test(thumb) ? thumb.replace(/([?&]w=)\d+/, `$1${width}`) : thumb;
};

const TIPOS_EMBEBIBLES = ['application/pdf', 'application/json'];

const esTipoActivo = (tipo) => /html|xml|svg|javascript|ecmascript/.test(tipo);

export const esPrevisualizable = (file) => {
    const tipo = file?.isDir ? '' : (file?.type || '').toLowerCase().split(';')[0].trim();
    if (!tipo || !file?.url || esTipoActivo(tipo)) return false;
    return tipo.startsWith('image/')
        || tipo.startsWith('video/')
        || tipo.startsWith('audio/')
        || tipo.startsWith('text/')
        || TIPOS_EMBEBIBLES.includes(tipo);
};

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const getFileIcon = (type) => {
    if (type.startsWith('image/')) return 'FileImageOutlined';
    if (type === 'application/pdf') return 'FilePdfOutlined';
    if (type.startsWith('video/')) return 'VideoCameraOutlined';
    if (type.startsWith('audio/')) return 'AudioOutlined';
    if (type.includes('word')) return 'FileWordOutlined';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'FileExcelOutlined';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'FilePptOutlined';
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'FileZipOutlined';
    return 'FileOutlined';
};

export const validateFileType = (file, allowedTypes = []) => {
    if (allowedTypes.length === 0) return true;

    return allowedTypes.some(type => {
        if (type.endsWith('/*')) {
            const baseType = type.split('/')[0];
            return file.type.startsWith(baseType + '/');
        }
        return file.type === type;
    });
};

export const validateFileSize = (file, maxSize) => {
    return file.size <= maxSize;
};

export const generatePreview = (file) => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('El archivo no es una imagen'));
            return;
        }

        const reader = new FileReader();

        reader.onloadend = () => {
            resolve(reader.result);
        };

        reader.onerror = () => {
            reject(new Error('Error al leer el archivo'));
        };

        reader.readAsDataURL(file);
    });
};

export const getImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('El archivo no es una imagen'));
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({
                width: img.width,
                height: img.height
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Error al cargar la imagen'));
        };

        img.src = url;
    });
};

export default {
    ACERVO_PAGE_SIZE,
    getBuckets,
    getAllBuckets,
    createBucket,
    updateBucket,
    listBucketObjects,
    getAcervoFiles,
    uploadAcervoFile,
    uploadMultipleFiles,
    updateAcervoFile,
    deleteAcervoFile,
    deleteMultipleFiles,
    buildFolderZipUrl,
    getFolders,
    createFolder,
    deleteFolder,
    moveAcervoFile,
    moveMultipleFiles,
    getFolderInfo,
    getAcervoResumen,
    initChunkedUpload,
    uploadChunk,
    completeChunkedUpload,
    toPublicUrl,
    thumbVariant,
    esPrevisualizable,

    formatFileSize,
    getFileIcon,
    validateFileType,
    validateFileSize,
    generatePreview,
    getImageDimensions
};
