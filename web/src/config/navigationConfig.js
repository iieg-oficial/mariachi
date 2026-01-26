export const navigationConfig = {
    menuItems: [
        {
            id: 'inicio',
            name: 'INICIO',
            path: '/',
            submenu: [
                { name: 'Banner (Conócenos)', path: '/#banner', icon: '🎨' },
                { name: 'Slider de actualizaciones', path: '/#slider', icon: '📰' },
                { name: 'MapaLab', path: '/#mapalab', icon: '🗺️' },
                { name: 'Información reciente', path: '/#reciente', icon: '📊' },
                { name: 'Sistemas de información', path: '/#sistemas', icon: '💻' },
                { name: 'Transparencia', path: '/#transparencia', icon: '🔍' },
                { name: 'Licitaciones', path: '/#licitaciones', icon: '📑' },
                { name: 'Contabilidad Gubernamental', path: '/#contabilidad', icon: '💰' },
                { name: 'Banner al sitio actual', path: '/#sitio-actual', icon: '🌐' },
                { name: 'Contacto', path: '/#contacto', icon: '📞' },
            ]
        },
        {
            id: 'conocenos',
            name: 'CONÓCENOS',
            path: '/conocenos',
            submenu: [
                { name: '¿Qué es el IIEG?', path: '/conocenos/que-es', icon: '🏛️' },
                { name: 'Objetivos financieros', path: '/conocenos/objetivos', icon: '🎯' },
                { name: 'Normatividad', path: '/conocenos/normatividad', icon: '📋' },
                { name: 'Directorio IIEG', path: '/conocenos/directorio', icon: '👥' },
                { name: 'Órganos de Gobierno', path: '/conocenos/organos', icon: '⚖️' },
                { name: 'Junta de Gobierno', path: '/conocenos/junta', icon: '👔' },
                { name: 'Consejo Consultivo', path: '/conocenos/consejo', icon: '🤝' },
                { name: 'Comité Asesor del Sistema de Información Geográfica', path: '/conocenos/comite-sig', icon: '🗺️' },
                { name: 'Comité de adquisiciones', path: '/conocenos/comite-adquisiciones', icon: '🛒' },
                { name: 'CISEJ / SNIEG', path: '/conocenos/cisej-snieg', icon: '🏢' },
                { name: 'Planeación', path: '/conocenos/planeacion', icon: '📊' },
                { name: 'Plan Institucional de Acción Integrada y de Conservación al Patrimonio', path: '/conocenos/plan-patrimonio', icon: '🏛️' },
                { name: 'Plan de trabajo anual (Integrado del CISEJ y Plan Anual de Trabajo del Sistema Estatal)', path: '/conocenos/plan-trabajo', icon: '📅' },
                { name: 'Informes de Gobierno Estatal', path: '/conocenos/informes', icon: '📑' },
                { name: 'Normatividad', path: '/conocenos/normativa', icon: '⚖️' },
                { name: 'Sistema Institucional Archivos Histórico Jalisco', path: '/conocenos/archivos', icon: '📚' },
                { name: 'Plan Anual de Desarrollo Archivístico (PADA)', path: '/conocenos/pada', icon: '📂' },
                { name: 'Catálogo clasificación y guía de archivos electrónicos (clasificador del IIEG)', path: '/conocenos/catalogo', icon: '🗂️' },
                { name: 'Cuadro de Operación Obligatoria conforme a Ley de Archivos del Edo. Jal.', path: '/conocenos/cuadro-operacion', icon: '📊' },
                { name: 'Relación de series documentales y sus plazos de conservación (catálogo de disposición)', path: '/conocenos/series', icon: '📄' },
                { name: 'Contacto', path: '/conocenos/contacto', icon: '📞' },
                { name: 'Preguntas Frecuentes', path: '/conocenos/faq', icon: '❓' },
            ]
        },
        {
            id: 'sistemas',
            name: 'SISTEMAS DE INFORMACIÓN',
            path: '/sistemas',
            submenu: [
                { name: 'MIDE-Jalisco', path: '/sistemas/mide-jalisco', icon: '📊' },
                { name: 'Laboratorio de Datos', path: '/sistemas/laboratorio', icon: '🔬' },
                { name: 'Tableros de Información', path: '/sistemas/tableros', icon: '📈' },
                { name: 'Sincronizador', path: '/sistemas/sincronizador', icon: '🔄' },
                { name: 'Proyectos de SIG', path: '/sistemas/sig', icon: '🗺️' },
                { name: 'SEFIPLAN', path: '/sistemas/sefiplan', icon: '💰' },
                { name: 'GeoMapFinder', path: '/sistemas/geomapfinder', icon: '🌍' },
                { name: 'Los datos más recientes', path: '/sistemas/datos-recientes', icon: '🆕' },
                { name: 'Observatorio Financiero', path: '/sistemas/observatorio', icon: '💹' },
                { name: 'Informes', path: '/sistemas/informes', icon: '📑' },
                { name: 'Estadística Experimental', path: '/sistemas/experimental', icon: '🧪' },
                { name: 'Clasificador de Cultivos', path: '/sistemas/cultivos', icon: '🌾' },
                { name: 'Clasificador de Superficie', path: '/sistemas/superficie', icon: '🗺️' },
                { name: 'Activos Geográficos', path: '/sistemas/activos', icon: '📍' },
                { name: 'Visor Asistente de', path: '/sistemas/visor', icon: '👁️' },
                { name: 'Zona al IIEJ', path: '/sistemas/zona-iiej', icon: '🏢' },
                { name: 'Avisos', path: '/sistemas/avisos', icon: '📢' },
            ]
        },
        {
            id: 'datos-abiertos',
            name: 'DATOS ABIERTOS Y DOCUMENTACIÓN',
            path: '/datos-abiertos',
            submenu: [
                { name: 'Datos Abiertos', path: '/datos-abiertos/datos', icon: '📊' },
                { name: 'Catálogo de Datos', path: '/datos-abiertos/catalogo', icon: '📚' },
                { name: 'Descarga de Datos', path: '/datos-abiertos/descarga', icon: '⬇️' },
                { name: 'APIS', path: '/datos-abiertos/apis', icon: '🔌' },
                { name: 'Documentos nacionales', path: '/datos-abiertos/nacionales', icon: '🇲🇽' },
                { name: 'Repositorios', path: '/datos-abiertos/repositorios', icon: '🗄️' },
                { name: 'Acuerdos técnicos', path: '/datos-abiertos/acuerdos', icon: '📝' },
                { name: 'Resoluciones SNIEG', path: '/datos-abiertos/resoluciones', icon: '⚖️' },
                { name: 'Asesorías técnicas', path: '/datos-abiertos/asesorias', icon: '👨‍🏫' },
                { name: 'Metodologías', path: '/datos-abiertos/metodologias', icon: '📐' },
                { name: 'Normativa técnica', path: '/datos-abiertos/normativa', icon: '📋' },
                { name: 'Memorias de procedimientos', path: '/datos-abiertos/memorias', icon: '📖' },
                { name: 'Estudios IIEJ', path: '/datos-abiertos/estudios', icon: '🔍' },
                { name: 'Servicio de Investigación IEJA', path: '/datos-abiertos/investigacion', icon: '🔬' },
                { name: 'Encuestas e Instituciones (ENOE)', path: '/datos-abiertos/encuestas', icon: '📋' },
            ]
        },
        {
            id: 'comunidad',
            name: 'COMUNIDAD',
            path: '/comunidad',
            submenu: [
                { name: 'Comunicados', path: '/comunidad/comunicados', icon: '📢' },
                { name: 'Noticias', path: '/comunidad/noticias', icon: '📰' },
                { name: 'Eventos', path: '/comunidad/eventos', icon: '📅' },
                { name: 'Primeros capacitaciones', path: '/comunidad/capacitaciones', icon: '🎓' },
                { name: 'Informes sobre la Situación Económica, las finanzas públicas y la Deuda Pública', path: '/comunidad/informes', icon: '💰' },
                { name: 'Cursos y Talleres', path: '/comunidad/cursos', icon: '📚' },
                { name: 'Laboratorio', path: '/comunidad/laboratorio', icon: '🔬' },
                { name: 'Servicios Social, Prácticas, PAP', path: '/comunidad/servicios', icon: '🤝' },
            ]
        },
        {
            id: 'transparencia',
            name: 'TRANSPARENCIA',
            path: '/transparencia',
            submenu: [
                { name: 'Transparencia información IIEJ LTAIPEJM', path: '/transparencia/informacion', icon: '📊' },
                { name: 'Unidad de Transparencia e Info. Pública', path: '/transparencia/unidad', icon: '🏢' },
            ]
        },
        {
            id: 'tramites',
            name: 'TRÁMITES Y SERVICIOS',
            path: '/tramites',
            submenu: [
                { name: 'Trámites', path: '/tramites/listado', icon: '📋' },
                { name: 'Servicios', path: '/tramites/servicios', icon: '🛠️' },
                { name: 'Consultas', path: '/tramites/consultas', icon: '❓' },
                { name: 'Asesorías', path: '/tramites/asesorias', icon: '👨‍💼' },
            ]
        },
    ]
};

export default navigationConfig;
