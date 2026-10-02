import { useEffect, useMemo, useState } from 'react';
import { Segmented } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

import PaginaRecurso from '../components/PaginaRecurso';
import { aFormData, listar } from '../api/intranetService';
import { AYUDA_PUBLICO, DOCUMENTOS } from '../constants/campos';

const VISTAS = [
    { label: 'Documentos', value: 'documentos' },
    { label: 'Carpetas', value: 'carpetas' },
];

const enMegas = (bytes) => `${(bytes / (1024 * 1024)).toLocaleString('es-MX', { maximumFractionDigits: 1 })} MB`;

const CARPETAS = {
    recurso: 'carpetas',
    singular: 'Carpeta',
    titulo: 'Documentos',
    descripcion: 'Carpetas en las que la intranet agrupa los documentos. Borrar una deja sus documentos sueltos.',
    alta: 'Nueva carpeta',
    vacio: 'Todavía no hay carpetas',
    icono: <FileTextOutlined />,
    columnas: [
        { title: 'Nombre', dataIndex: 'nombre' },
        { title: 'Documentos', dataIndex: 'documentos', width: 120 },
        { title: 'Orden', dataIndex: 'orden', width: 80 },
    ],
    campos: [
        { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, maximo: 100 },
        { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'texto-largo', maximo: 300 },
        { nombre: 'orden', etiqueta: 'Orden', tipo: 'numero' },
    ],
};

const aPayloadDocumento = (valores, { edicion = false } = {}) => {
    const datos = aFormData(valores);
    if (edicion && (valores.carpeta_id === undefined || valores.carpeta_id === null)) {
        datos.append('sin_carpeta', 'true');
    }
    return datos;
};

const definicionDeDocumentos = (carpetas) => {
    const nombres = Object.fromEntries(carpetas.map((c) => [c.id, c.nombre]));
    const carpeta = {
        nombre: 'carpeta_id', etiqueta: 'Carpeta', tipo: 'opciones',
        opciones: carpetas.map((c) => ({ value: c.id, label: c.nombre })),
        ayuda: 'Vacía deja el documento suelto, fuera de las carpetas.',
    };
    return {
        recurso: 'documentos',
        singular: 'Documento',
        titulo: 'Documentos',
        descripcion: 'Archivos que cualquier persona del instituto puede descargar. Hasta 20 MB por archivo.',
        alta: 'Nuevo documento',
        vacio: 'Todavía no hay documentos',
        icono: <FileTextOutlined />,
        aPayload: aPayloadDocumento,
        columnas: [
            { title: 'Título', dataIndex: 'title' },
            { title: 'Carpeta', dataIndex: 'carpeta_id', width: 180, render: (id) => nombres[id] ?? '—' },
            { title: 'Archivo', dataIndex: 'file_name' },
            { title: 'Tamaño', dataIndex: 'file_size', width: 110, render: enMegas },
            { title: 'Orden', dataIndex: 'order', width: 80 },
        ],
        campos: [
            { nombre: 'title', etiqueta: 'Título', requerido: true, maximo: 150 },
            carpeta,
            {
                nombre: 'file', etiqueta: 'Archivo', tipo: 'archivo', requerido: true,
                acepta: DOCUMENTOS, ayuda: AYUDA_PUBLICO,
            },
            { nombre: 'order', etiqueta: 'Orden', tipo: 'numero' },
        ],
        camposEdicion: [
            { nombre: 'title', etiqueta: 'Título', requerido: true, maximo: 150 },
            carpeta,
            { nombre: 'order', etiqueta: 'Orden', tipo: 'numero' },
        ],
    };
};

const DocumentosPage = () => {
    const [vista, setVista] = useState('documentos');
    const [carpetas, setCarpetas] = useState([]);

    useEffect(() => {
        let vigente = true;
        listar('carpetas')
            .then((lista) => { if (vigente) setCarpetas(lista); })
            .catch(() => { if (vigente) setCarpetas([]); });
        return () => { vigente = false; };
    }, [vista]);

    const documentos = useMemo(() => definicionDeDocumentos(carpetas), [carpetas]);
    const selector = <Segmented options={VISTAS} value={vista} onChange={setVista} />;

    return (
        <PaginaRecurso
            key={vista}
            definicion={vista === 'documentos' ? documentos : CARPETAS}
            extra={selector}
        />
    );
};

export default DocumentosPage;
