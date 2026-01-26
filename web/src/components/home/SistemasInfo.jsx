import { Link } from 'react-router'

function SistemasInfo() {
    const sistemas = [
        {
            id: 1,
            name: 'MIDE Jalisco',
            description: 'Sistema de Monitoreo de Indicadores del Desarrollo',
            icon: '📈',
            link: '/sistemas/mide-jalisco',
            featured: true
        },
        {
            id: 2,
            name: 'MapaLab',
            description: 'Laboratorio de mapas y datos geoespaciales',
            icon: '🗺️',
            link: '/sistemas/mapalab',
            featured: true
        },
        {
            id: 3,
            name: 'Tableros Interactivos',
            description: 'Visualizaciones dinámicas de datos estadísticos',
            icon: '📊',
            link: '/sistemas/tableros',
            featured: true
        },
        {
            id: 4,
            name: 'Catálogo de Datos',
            description: 'Repositorio completo de conjuntos de datos',
            icon: '📁',
            link: '/datos-abiertos/catalogo',
            featured: false
        },
        {
            id: 5,
            name: 'Observatorio Territorial',
            description: 'Análisis y estudios del territorio jalisciense',
            icon: '🔍',
            link: '/sistemas/observatorio',
            featured: false
        },
        {
            id: 6,
            name: 'Sistema de Consultas',
            description: 'Herramienta para consultas especializadas',
            icon: '💻',
            link: '/sistemas/consultas',
            featured: false
        }
    ]

    return (
        <section id="sistemas" className="py-16 bg-white scroll-mt-16">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                            Sistemas de Información
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Accede a nuestras herramientas y plataformas especializadas para análisis de datos
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                        {sistemas.filter(s => s.featured).map((sistema) => (
                            <Link
                                key={sistema.id}
                                to={sistema.link}
                                className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-8 hover:shadow-xl transition-all duration-300 border-2 border-purple-200 hover:border-purple-400"
                            >
                                <div className="text-5xl mb-4">{sistema.icon}</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">
                                    {sistema.name}
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    {sistema.description}
                                </p>
                                <div className="flex items-center text-purple-700 font-semibold group-hover:gap-2 transition-all">
                                    Explorar
                                    <svg className="w-5 h-5 ml-1 group-hover:ml-2 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        {sistemas.filter(s => !s.featured).map((sistema) => (
                            <Link
                                key={sistema.id}
                                to={sistema.link}
                                className="group bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-purple-400 hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="text-3xl">{sistema.icon}</div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">
                                            {sistema.name}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            {sistema.description}
                                        </p>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <Link
                            to="/sistemas"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-800 transition-colors duration-200 shadow-lg hover:shadow-xl"
                        >
                            Ver todos los sistemas
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default SistemasInfo
