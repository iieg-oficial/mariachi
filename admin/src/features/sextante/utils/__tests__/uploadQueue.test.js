import { beforeEach, describe, expect, it, vi } from 'vitest';

const subir = vi.fn();
vi.mock('@features/sextante/api/geoserverFilesService', () => ({
    uploadGeoserverFileSmart: (...args) => subir(...args),
}));

const cargar = async () => {
    vi.resetModules();
    return import('@features/sextante/utils/uploadQueue');
};

const esperar = () => new Promise((resolve) => setTimeout(resolve, 0));
const entrada = (name, size = 100) => ({ file: { name }, name, size, workspace: '', label: name });

describe('uploadQueue', () => {
    beforeEach(() => {
        subir.mockReset();
    });

    it('sube en secuencia y avisa cada archivo terminado', async () => {
        const q = await cargar();
        const orden = [];
        subir.mockImplementation(async ({ name }) => { orden.push(name); });
        const avisos = [];
        q.onFileUploaded((item) => avisos.push(item.name));

        q.enqueueUploads([entrada('a.svg'), entrada('b.svg')]);
        await esperar();

        expect(orden).toEqual(['a.svg', 'b.svg']);
        expect(avisos).toEqual(['a.svg', 'b.svg']);
        expect(q.getUploads().every((it) => it.status === 'done')).toBe(true);
    });

    it('marca el error, sigue con el resto y permite reintentar', async () => {
        const q = await cargar();
        subir.mockRejectedValueOnce({ response: { data: { detail: 'Segmento invalido' } } });
        subir.mockResolvedValue({});

        q.enqueueUploads([entrada('a.svg'), entrada('b.svg')]);
        await esperar();

        const [a, b] = q.getUploads();
        expect(a).toMatchObject({ status: 'error', error: 'Segmento invalido' });
        expect(b.status).toBe('done');

        q.retryUpload(a.id);
        await esperar();
        expect(q.getUploads()[0].status).toBe('done');
    });

    it('bloquea la salida de la página mientras hay subidas activas', async () => {
        const q = await cargar();
        const add = vi.spyOn(window, 'addEventListener');
        const remove = vi.spyOn(window, 'removeEventListener');
        let terminar;
        subir.mockImplementation(() => new Promise((resolve) => { terminar = resolve; }));

        q.enqueueUploads([entrada('a.svg')]);
        expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));

        terminar({});
        await esperar();
        expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function));
        add.mockRestore();
        remove.mockRestore();
    });

    it('resume el avance por bytes', async () => {
        const q = await cargar();
        const resumen = q.summarizeUploads([
            { status: 'done', size: 300, percent: 100 },
            { status: 'uploading', size: 200, percent: 50 },
            { status: 'queued', size: 500, percent: 0 },
        ]);
        expect(resumen).toMatchObject({ total: 3, done: 1, failed: 0, position: 2, active: true, percent: 40 });
    });

    it('limpia solo lo terminado', async () => {
        const q = await cargar();
        subir.mockImplementation(() => new Promise(() => {}));
        q.enqueueUploads([entrada('a.svg'), entrada('b.svg')]);
        q.clearFinishedUploads();
        expect(q.getUploads()).toHaveLength(2);
    });
});
