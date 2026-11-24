import { useEffect, useState } from 'react';

const FIN_DIRECTORIO = 0x06054b50;
const ENTRADA = 0x02014b50;
const METADATA = /(^|\/)metadata\.txt$/;

const buscarFinDirectorio = (vista) => {
    for (let i = vista.byteLength - 22; i >= 0; i -= 1) {
        if (vista.getUint32(i, true) === FIN_DIRECTORIO) return i;
    }
    return -1;
};

const inflar = async (datos, metodo) => {
    if (metodo === 0) return datos;
    const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(flujo).arrayBuffer());
};

const leerMetadata = async (buffer) => {
    const vista = new DataView(buffer);
    const fin = buscarFinDirectorio(vista);
    if (fin < 0) return null;
    const decoder = new TextDecoder();
    let pos = vista.getUint32(fin + 16, true);
    const total = vista.getUint16(fin + 10, true);
    for (let n = 0; n < total && vista.getUint32(pos, true) === ENTRADA; n += 1) {
        const metodo = vista.getUint16(pos + 10, true);
        const tamano = vista.getUint32(pos + 20, true);
        const largoNombre = vista.getUint16(pos + 28, true);
        const local = vista.getUint32(pos + 42, true);
        const nombre = decoder.decode(new Uint8Array(buffer, pos + 46, largoNombre));
        if (METADATA.test(nombre)) {
            const inicio = local + 30 + vista.getUint16(local + 26, true) + vista.getUint16(local + 28, true);
            return decoder.decode(await inflar(new Uint8Array(buffer, inicio, tamano), metodo));
        }
        pos += 46 + largoNombre + vista.getUint16(pos + 30, true) + vista.getUint16(pos + 32, true);
    }
    return null;
};

export default function useVersionDelZip(url) {
    const [version, setVersion] = useState(null);

    useEffect(() => {
        const control = new AbortController();
        fetch(url, { cache: 'no-cache', signal: control.signal })
            .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(res.status))))
            .then(leerMetadata)
            .then((texto) => setVersion(texto?.match(/^version=(.+)$/m)?.[1].trim() || null))
            .catch(() => setVersion(null));
        return () => control.abort();
    }, [url]);

    return version;
}
