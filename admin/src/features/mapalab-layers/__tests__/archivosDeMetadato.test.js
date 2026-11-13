import { describe, expect, it } from 'vitest';
import { carpetaPorExtension, nombreLegible } from '@features/mapalab-layers/utils/archivosDeMetadato';

describe('archivos de metadato', () => {
    it('cada extensión va a su carpeta', () => {
        expect(carpetaPorExtension({ name: 'Diccionario.XLSX' })).toBe('metadata/xlsx/');
        expect(carpetaPorExtension('notas.txt')).toBe('metadata/txt/');
        expect(carpetaPorExtension('sin_extension')).toBe('metadata/');
    });

    it('el nombre sale legible del archivo', () => {
        expect(nombreLegible('/metadata/xlsx/diccionario_de_datos.xlsx')).toBe('Diccionario de datos');
        expect(nombreLegible('Ficha-tecnica  2025.pdf')).toBe('Ficha tecnica 2025');
    });

    it('un nombre generado no se propone', () => {
        expect(nombreLegible('metadata/txt/3f2a9c1e-1b2c-4d5e-8f90-a1b2c3d4e5f6.txt')).toBe('');
    });
});
