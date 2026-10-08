import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@shared/services/api', () => ({ default: { put: vi.fn(), post: vi.fn() } }));
vi.mock('@shared/services/message', () => ({ message: { warning: vi.fn() } }));

import api from '@shared/services/api';
import { message } from '@shared/services/message';
import {
    autorDeCampo, guardarBorradorCompartido, recordarVersiones, versionDe,
} from '@features/mapalab-layers/utils/borradorCompartido';

describe('borrador compartido', () => {
    beforeEach(() => vi.clearAllMocks());

    it('manda la version que vio y recuerda la nueva', async () => {
        recordarVersiones([{ resource_type: 'layer', resource_id: 'rios', version: 3 }]);
        api.put.mockResolvedValueOnce({ data: { version: 4 } });
        await guardarBorradorCompartido('layer', 'rios', { label: 'A' }, { quitar: ['styles'] });
        expect(api.put).toHaveBeenCalledWith('/borradores/layer/rios', {
            data: { label: 'A' }, quitar: ['styles'], base_version: 3,
        });
        expect(versionDe('layer', 'rios')).toBe(4);
    });

    it('si el borrador queda vacio olvida la version', async () => {
        recordarVersiones([{ resource_type: 'layer', resource_id: 'vacio', version: 2 }]);
        api.put.mockResolvedValueOnce({ data: null });
        await guardarBorradorCompartido('layer', 'vacio', {}, { quitar: ['label'] });
        expect(versionDe('layer', 'vacio')).toBeNull();
    });

    it('la llave de metadatos viaja codificada', async () => {
        api.put.mockResolvedValueOnce({ data: { version: 1 } });
        await guardarBorradorCompartido('layer_metadata', 'agua:rios', { titulo: 'x' });
        expect(api.put.mock.calls[0][0]).toBe('/borradores/layer_metadata/agua%3Arios');
    });

    it('un choque avisa con el texto del servidor y vuelve a lanzar', async () => {
        api.put.mockRejectedValueOnce({ response: { status: 409, data: { detail: 'Ana cambió label hace un momento.' } } });
        await expect(guardarBorradorCompartido('layer', 'rios', { label: 'B' })).rejects.toBeTruthy();
        expect(message.warning).toHaveBeenCalledWith(expect.objectContaining({ content: 'Ana cambió label hace un momento.' }));
    });

    it('el autor de un campo sale de autores, o de quien creo el borrador', () => {
        const borrador = { autores: { label: { nombre: 'Ana' } }, usuario: { name: 'Beto' } };
        expect(autorDeCampo(borrador, 'label')).toBe('Ana');
        expect(autorDeCampo(borrador, 'styles')).toBe('Beto');
        expect(autorDeCampo(null, 'label')).toBeNull();
    });
});
