import api from '@shared/services/api';

const DB_NAME = 'CMS_MediaStorage';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

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


export const getMediaFiles = async (filters = {}) => {
    try {
        const params = new URLSearchParams();

        if (filters.folder) params.append('folder', filters.folder);
        if (filters.type) params.append('type', filters.type);
        if (filters.search) params.append('search', filters.search);

        const response = await api.get(`/multimedia?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching media files:', error);
        throw error;
    }
};

export const getMediaFile = async (id) => {
    try {
        const response = await api.get(`/multimedia/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching media file:', error);
        throw error;
    }
};

export const uploadMediaFile = async (file, options = {}) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        if (options.folder) {
            formData.append('folder', options.folder);
        }

        if (options.alt) {
            formData.append('alt', options.alt);
        }

        const response = await api.post('/multimedia', formData, {
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
            uploadMediaFile(file, {
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

export const updateMediaFile = async (id, updates) => {
    try {
        const response = await api.put(`/multimedia/${id}`, updates);
        return response.data;
    } catch (error) {
        console.error('Error updating media file:', error);
        throw error;
    }
};

export const deleteMediaFile = async (id) => {
    try {
        await api.delete(`/multimedia/${id}`);

        await deleteFromIndexedDB(id);

        return true;
    } catch (error) {
        console.error('Error deleting media file:', error);
        throw error;
    }
};

export const deleteMultipleFiles = async (ids) => {
    try {
        const deletePromises = ids.map(id => deleteMediaFile(id));
        await Promise.all(deletePromises);
        return true;
    } catch (error) {
        console.error('Error deleting multiple files:', error);
        throw error;
    }
};


export const getFolders = async () => {
    try {
        const response = await api.get('/multimedia/carpetas');
        return response.data;
    } catch (error) {
        console.error('Error fetching folders:', error);
        throw error;
    }
};

export const createFolder = async (name, parent = null) => {
    try {
        const response = await api.post('/multimedia/carpetas', { name, parent });
        return response.data;
    } catch (error) {
        console.error('Error creating folder:', error);
        throw error;
    }
};

export const deleteFolder = async (id) => {
    try {
        await api.delete(`/multimedia/carpetas/${id}`);
        return true;
    } catch (error) {
        console.error('Error deleting folder:', error);
        throw error;
    }
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
    getMediaFiles,
    getMediaFile,
    uploadMediaFile,
    uploadMultipleFiles,
    updateMediaFile,
    deleteMediaFile,
    deleteMultipleFiles,
    getFolders,
    createFolder,
    deleteFolder,

    formatFileSize,
    getFileIcon,
    validateFileType,
    validateFileSize,
    generatePreview,
    getImageDimensions
};
