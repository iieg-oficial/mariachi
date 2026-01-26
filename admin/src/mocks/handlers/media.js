import { http, HttpResponse } from 'msw';
import { mediaData, folders } from '../data/media';
import { logHistory, getCurrentUserId } from '../utils/historyLogger';

let media = [...mediaData];
let mediaFolders = [...folders];

const storeFile = async (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve({
                url: reader.result,
                thumbnail: reader.result
            });
        };
        reader.readAsDataURL(file);
    });
};

export const mediaHandlers = [
    http.get('/media', async ({ request }) => {
        const url = new URL(request.url);
        const folder = url.searchParams.get('folder');
        const type = url.searchParams.get('type');
        const search = url.searchParams.get('search');

        let filteredMedia = [...media];

        if (folder) {
            filteredMedia = filteredMedia.filter(m => m.folder === folder);
        }

        if (type) {
            filteredMedia = filteredMedia.filter(m => m.type.startsWith(type));
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filteredMedia = filteredMedia.filter(m =>
                m.name.toLowerCase().includes(searchLower) ||
                m.originalName.toLowerCase().includes(searchLower)
            );
        }

        filteredMedia.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

        return HttpResponse.json(filteredMedia);
    }),

    http.get('/media/folders', async () => {
        return HttpResponse.json(mediaFolders);
    }),

    http.get('/media/:id', async ({ params }) => {
        const file = media.find(m => m.id === params.id);

        if (!file) {
            return HttpResponse.json(
                { error: 'Archivo no encontrado' },
                { status: 404 }
            );
        }

        return HttpResponse.json(file);
    }),

    http.post('/media', async ({ request }) => {
        try {
            const formData = await request.formData();
            const file = formData.get('file');
            const folder = formData.get('folder') || '/';
            const alt = formData.get('alt') || '';
            const userId = getCurrentUserId();

            if (!file) {
                return HttpResponse.json(
                    { error: 'No se proporcionó archivo' },
                    { status: 400 }
                );
            }

            const { url, thumbnail } = await storeFile(file);

            const slug = file.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9.-]/g, '');

            const newMedia = {
                id: String(media.length + 1),
                name: slug,
                originalName: file.name,
                type: file.type,
                size: file.size,
                url: url,
                thumbnail: file.type.startsWith('image/') ? thumbnail : getDefaultThumbnail(file.type),
                folder: folder,
                uploadedBy: userId || '1',
                uploadedByName: 'Usuario',
                uploadedAt: new Date().toISOString(),
                metadata: {
                    ...(file.type.startsWith('image/') && {
                        width: 800,
                        height: 600,
                        alt: alt
                    }),
                    ...(file.type === 'application/pdf' && {
                        pages: 1,
                        description: alt
                    })
                }
            };

            media.push(newMedia);

            if (userId) {
                logHistory({
                    userId,
                    action: 'create',
                    resource: 'media',
                    resourceId: newMedia.id,
                    description: `Subió el archivo "${newMedia.originalName}"`,
                    details: {
                        type: newMedia.type,
                        size: newMedia.size,
                        folder: newMedia.folder
                    }
                });
            }

            return HttpResponse.json(newMedia, { status: 201 });
        } catch (error) {
            console.error('Error uploading file:', error);
            return HttpResponse.json(
                { error: 'Error al subir archivo' },
                { status: 500 }
            );
        }
    }),

    http.put('/media/:id', async ({ params, request }) => {
        try {
            const updates = await request.json();
            const mediaIndex = media.findIndex(m => m.id === params.id);
            const userId = getCurrentUserId();

            if (mediaIndex === -1) {
                return HttpResponse.json(
                    { error: 'Archivo no encontrado' },
                    { status: 404 }
                );
            }

            const oldMedia = { ...media[mediaIndex] };

            media[mediaIndex] = {
                ...media[mediaIndex],
                folder: updates.folder !== undefined ? updates.folder : media[mediaIndex].folder,
                metadata: {
                    ...media[mediaIndex].metadata,
                    ...(updates.alt !== undefined && { alt: updates.alt }),
                    ...(updates.description !== undefined && { description: updates.description })
                }
            };

            if (userId) {
                const changes = [];
                if (oldMedia.folder !== media[mediaIndex].folder) {
                    changes.push(`Movió de "${oldMedia.folder}" a "${media[mediaIndex].folder}"`);
                }
                if (updates.alt || updates.description) {
                    changes.push('Actualizó metadata');
                }

                logHistory({
                    userId,
                    action: 'update',
                    resource: 'media',
                    resourceId: media[mediaIndex].id,
                    description: `Actualizó el archivo "${media[mediaIndex].originalName}"`,
                    details: {
                        changes: changes
                    }
                });
            }

            return HttpResponse.json(media[mediaIndex]);
        } catch (error) {
            console.error('Error updating media:', error);
            return HttpResponse.json(
                { error: 'Error al actualizar archivo' },
                { status: 500 }
            );
        }
    }),

    http.delete('/media/:id', async ({ params }) => {
        const mediaIndex = media.findIndex(m => m.id === params.id);
        const userId = getCurrentUserId();

        if (mediaIndex === -1) {
            return HttpResponse.json(
                { error: 'Archivo no encontrado' },
                { status: 404 }
            );
        }

        const deletedMedia = { ...media[mediaIndex] };
        media.splice(mediaIndex, 1);

        if (userId) {
            logHistory({
                userId,
                action: 'delete',
                resource: 'media',
                resourceId: deletedMedia.id,
                description: `Eliminó el archivo "${deletedMedia.originalName}"`,
                details: {
                    type: deletedMedia.type,
                    folder: deletedMedia.folder
                }
            });
        }

        return HttpResponse.json(
            { message: 'Archivo eliminado exitosamente' },
            { status: 200 }
        );
    }),

    http.post('/media/folders', async ({ request }) => {
        try {
            const { name, parent } = await request.json();
            const userId = getCurrentUserId();

            if (!name) {
                return HttpResponse.json(
                    { error: 'El nombre de la carpeta es requerido' },
                    { status: 400 }
                );
            }

            const path = parent
                ? `${parent}/${name}`
                : `/${name}`;

            const newFolder = {
                id: String(mediaFolders.length + 1),
                name,
                path,
                parent: parent || null
            };

            mediaFolders.push(newFolder);

            if (userId) {
                logHistory({
                    userId,
                    action: 'create',
                    resource: 'media-folder',
                    resourceId: newFolder.id,
                    description: `Creó la carpeta "${name}"`,
                    details: {
                        path: newFolder.path
                    }
                });
            }

            return HttpResponse.json(newFolder, { status: 201 });
        } catch (error) {
            console.error('Error creating folder:', error);
            return HttpResponse.json(
                { error: 'Error al crear carpeta' },
                { status: 500 }
            );
        }
    }),

    http.delete('/media/folders/:id', async ({ params }) => {
        const folderIndex = mediaFolders.findIndex(f => f.id === params.id);
        const userId = getCurrentUserId();

        if (folderIndex === -1) {
            return HttpResponse.json(
                { error: 'Carpeta no encontrada' },
                { status: 404 }
            );
        }

        const folder = mediaFolders[folderIndex];

        const filesInFolder = media.filter(m => m.folder === folder.path);
        if (filesInFolder.length > 0) {
            return HttpResponse.json(
                { error: 'No se puede eliminar una carpeta que contiene archivos' },
                { status: 400 }
            );
        }

        mediaFolders.splice(folderIndex, 1);

        if (userId) {
            logHistory({
                userId,
                action: 'delete',
                resource: 'media-folder',
                resourceId: folder.id,
                description: `Eliminó la carpeta "${folder.name}"`,
                details: {
                    path: folder.path
                }
            });
        }

        return HttpResponse.json(
            { message: 'Carpeta eliminada exitosamente' },
            { status: 200 }
        );
    })
];

function getDefaultThumbnail(type) {
    if (type === 'application/pdf') {
        return 'https://via.placeholder.com/150x150/ff4d4f/ffffff?text=PDF';
    }
    if (type.startsWith('video/')) {
        return 'https://via.placeholder.com/150x150/722ed1/ffffff?text=VIDEO';
    }
    if (type.startsWith('audio/')) {
        return 'https://via.placeholder.com/150x150/13c2c2/ffffff?text=AUDIO';
    }
    return 'https://via.placeholder.com/150x150/8c8c8c/ffffff?text=FILE';
}
