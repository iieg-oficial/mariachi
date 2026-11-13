import ArchivosCell from '@features/mapalab-layers/components/metadataGrid/ArchivosCell';
import { nombreLegible } from '@features/mapalab-layers/utils/archivosDeMetadato';

const desdeTexto = (texto) => String(texto || '')
    .split(/[;\n]/)
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((enlace) => ({ nombre: nombreLegible(enlace), enlace }));

export const archivosColumn = {
    component: ArchivosCell,
    disableKeys: true,
    keepFocus: true,
    deleteValue: () => null,
    copyValue: ({ rowData }) => (rowData || []).map((a) => a.enlace).join('; '),
    pasteValue: ({ value }) => {
        const lista = desdeTexto(value);
        return lista.length ? lista : null;
    },
    isCellEmpty: ({ rowData }) => !rowData?.length,
};
