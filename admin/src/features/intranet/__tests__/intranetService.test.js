import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@shared/services/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from '@shared/services/api';
import {
    aFormData, actualizar, crear, eliminar, listar, revisar, urlArchivo,
} from '../api/intranetService';

describe('intranetService', () => {
    beforeEach(() => vi.clearAllMocks());

    it('lista, crea, actualiza y elimina contra /intranet/<recurso>', async () => {
        api.get.mockResolvedValue({ data: [{ id: 1 }] });
        api.post.mockResolvedValue({ data: { id: 2 } });
        api.put.mockResolvedValue({ data: { id: 2 } });
        api.delete.mockResolvedValue({});

        expect(await listar('enlaces')).toEqual([{ id: 1 }]);
        await crear('enlaces', { seccion: 'S' });
        await actualizar('enlaces', 2, { seccion: 'T' });
        await eliminar('enlaces', 2);

        expect(api.get).toHaveBeenCalledWith('/intranet/enlaces');
        expect(api.post).toHaveBeenCalledWith('/intranet/enlaces', { seccion: 'S' });
        expect(api.put).toHaveBeenCalledWith('/intranet/enlaces/2', { seccion: 'T' });
        expect(api.delete).toHaveBeenCalledWith('/intranet/enlaces/2');
    });

    it('revisar manda el estado al carrusel', async () => {
        api.put.mockResolvedValue({ data: { id: 3, status: 'aprobado' } });
        await revisar(3, 'aprobado');
        expect(api.put).toHaveBeenCalledWith('/intranet/carrusel/3/revisar', { status: 'aprobado' });
    });

    it('urlArchivo solo convierte rutas de subidas de intranet', () => {
        expect(urlArchivo('/static/uploads/gallery/abc.png'))
            .toBe('/api/mariachi/intranet/archivos/gallery/abc.png');
        expect(urlArchivo('https://otro.sitio/foto.png')).toBeNull();
        expect(urlArchivo('#1A2B3C')).toBeNull();
        expect(urlArchivo(null)).toBeNull();
    });

    it('aFormData omite vacios y conserva archivos y ceros', () => {
        const archivo = new File(['x'], 'f.png', { type: 'image/png' });
        const datos = aFormData({ title: 'T', order: 0, file: archivo, description: '', otro: undefined });
        expect([...datos.keys()]).toEqual(['title', 'order', 'file']);
        expect(datos.get('file')).toBe(archivo);
    });
});
