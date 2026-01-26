export const mediaData = [
    {
        id: '1',
        name: 'logo-iieg.png',
        originalName: 'Logo IIEG.png',
        type: 'image/png',
        size: 45600,
        url: 'https://via.placeholder.com/400x300/1890ff/ffffff?text=Logo+IIEG',
        thumbnail: 'https://via.placeholder.com/150x150/1890ff/ffffff?text=Logo+IIEG',
        folder: '/logos',
        uploadedBy: '3',
        uploadedByName: 'Diseñadora Gráfica',
        uploadedAt: new Date('2025-10-25T10:00:00').toISOString(),
        metadata: {
            width: 400,
            height: 300,
            alt: 'Logo del Instituto de Información Estadística y Geográfica'
        }
    },
    {
        id: '2',
        name: 'banner-inicio.jpg',
        originalName: 'Banner Página Inicio.jpg',
        type: 'image/jpeg',
        size: 125000,
        url: 'https://via.placeholder.com/1200x400/52c41a/ffffff?text=Banner+Inicio',
        thumbnail: 'https://via.placeholder.com/150x150/52c41a/ffffff?text=Banner',
        folder: '/banners',
        uploadedBy: '3',
        uploadedByName: 'Diseñadora Gráfica',
        uploadedAt: new Date('2025-10-26T14:30:00').toISOString(),
        metadata: {
            width: 1200,
            height: 400,
            alt: 'Banner principal de la página de inicio'
        }
    },
    {
        id: '3',
        name: 'informe-2024.pdf',
        originalName: 'Informe Anual 2024.pdf',
        type: 'application/pdf',
        size: 2500000,
        url: '/uploads/documents/informe-2024.pdf',
        thumbnail: 'https://via.placeholder.com/150x150/ff4d4f/ffffff?text=PDF',
        folder: '/documentos',
        uploadedBy: '2',
        uploadedByName: 'Editora de Contenidos',
        uploadedAt: new Date('2025-10-27T09:15:00').toISOString(),
        metadata: {
            pages: 45,
            description: 'Informe anual de actividades 2024'
        }
    },
    {
        id: '4',
        name: 'grafica-poblacion.png',
        originalName: 'Gráfica Población.png',
        type: 'image/png',
        size: 89000,
        url: 'https://via.placeholder.com/800x600/fa8c16/ffffff?text=Grafica+Poblacion',
        thumbnail: 'https://via.placeholder.com/150x150/fa8c16/ffffff?text=Grafica',
        folder: '/graficas',
        uploadedBy: '2',
        uploadedByName: 'Editora de Contenidos',
        uploadedAt: new Date('2025-10-28T11:00:00').toISOString(),
        metadata: {
            width: 800,
            height: 600,
            alt: 'Gráfica de crecimiento poblacional'
        }
    },
    {
        id: '5',
        name: 'mapa-jalisco.jpg',
        originalName: 'Mapa del Estado de Jalisco.jpg',
        type: 'image/jpeg',
        size: 156000,
        url: 'https://via.placeholder.com/1000x800/13c2c2/ffffff?text=Mapa+Jalisco',
        thumbnail: 'https://via.placeholder.com/150x150/13c2c2/ffffff?text=Mapa',
        folder: '/mapas',
        uploadedBy: '3',
        uploadedByName: 'Diseñadora Gráfica',
        uploadedAt: new Date('2025-10-29T15:45:00').toISOString(),
        metadata: {
            width: 1000,
            height: 800,
            alt: 'Mapa geográfico del estado de Jalisco'
        }
    },
    {
        id: '6',
        name: 'censo-2025-guia.pdf',
        originalName: 'Guía Censo 2025.pdf',
        type: 'application/pdf',
        size: 1800000,
        url: '/uploads/documents/censo-2025-guia.pdf',
        thumbnail: 'https://via.placeholder.com/150x150/ff4d4f/ffffff?text=PDF',
        folder: '/documentos',
        uploadedBy: '2',
        uploadedByName: 'Editora de Contenidos',
        uploadedAt: new Date('2025-10-30T08:30:00').toISOString(),
        metadata: {
            pages: 28,
            description: 'Guía metodológica para el Censo 2025'
        }
    },
    {
        id: '7',
        name: 'icon-estadisticas.svg',
        originalName: 'Icono Estadísticas.svg',
        type: 'image/svg+xml',
        size: 3200,
        url: 'https://via.placeholder.com/200x200/722ed1/ffffff?text=Stats',
        thumbnail: 'https://via.placeholder.com/150x150/722ed1/ffffff?text=Stats',
        folder: '/iconos',
        uploadedBy: '3',
        uploadedByName: 'Diseñadora Gráfica',
        uploadedAt: new Date('2025-10-30T16:00:00').toISOString(),
        metadata: {
            width: 200,
            height: 200,
            alt: 'Icono de estadísticas'
        }
    },
    {
        id: '8',
        name: 'foto-equipo.jpg',
        originalName: 'Foto del Equipo IIEG.jpg',
        type: 'image/jpeg',
        size: 234000,
        url: 'https://via.placeholder.com/1200x800/eb2f96/ffffff?text=Equipo+IIEG',
        thumbnail: 'https://via.placeholder.com/150x150/eb2f96/ffffff?text=Equipo',
        folder: '/fotos',
        uploadedBy: '3',
        uploadedByName: 'Diseñadora Gráfica',
        uploadedAt: new Date('2025-10-31T10:00:00').toISOString(),
        metadata: {
            width: 1200,
            height: 800,
            alt: 'Fotografía del equipo de trabajo del IIEG'
        }
    }
];

export const folders = [
    { id: '1', name: 'logos', path: '/logos', parent: null },
    { id: '2', name: 'banners', path: '/banners', parent: null },
    { id: '3', name: 'documentos', path: '/documentos', parent: null },
    { id: '4', name: 'graficas', path: '/graficas', parent: null },
    { id: '5', name: 'mapas', path: '/mapas', parent: null },
    { id: '6', name: 'iconos', path: '/iconos', parent: null },
    { id: '7', name: 'fotos', path: '/fotos', parent: null }
];
