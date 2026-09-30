import { FileTextOutlined } from '@ant-design/icons';

import PaginaRecurso from '../components/PaginaRecurso';
import { aFormData } from '../api/intranetService';
import { AYUDA_PUBLICO, DOCUMENTOS } from '../constants/campos';

const enMegas = (bytes) => `${(bytes / (1024 * 1024)).toLocaleString('es-MX', { maximumFractionDigits: 1 })} MB`;

const DEFINICION = {
    recurso: 'documentos',
    singular: 'Documento',
    titulo: 'Documentos',
    descripcion: 'Archivos que cualquier persona del instituto puede descargar. Hasta 20 MB por archivo.',
    alta: 'Nuevo documento',
    vacio: 'Todavía no hay documentos',
    icono: <FileTextOutlined />,
    editable: false,
    aPayload: aFormData,
    columnas: [
        { title: 'Título', dataIndex: 'title' },
        { title: 'Archivo', dataIndex: 'file_name' },
        { title: 'Tamaño', dataIndex: 'file_size', width: 110, render: enMegas },
        { title: 'Orden', dataIndex: 'order', width: 80 },
    ],
    campos: [
        { nombre: 'title', etiqueta: 'Título', requerido: true, maximo: 150 },
        {
            nombre: 'file', etiqueta: 'Archivo', tipo: 'archivo', requerido: true,
            acepta: DOCUMENTOS, ayuda: AYUDA_PUBLICO,
        },
        { nombre: 'order', etiqueta: 'Orden', tipo: 'numero' },
    ],
};

const DocumentosPage = () => <PaginaRecurso definicion={DEFINICION} />;

export default DocumentosPage;
