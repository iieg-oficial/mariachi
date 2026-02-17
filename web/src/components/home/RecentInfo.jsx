import { Link } from 'react-router'

function RecentInfo({
    title = "Información Más Reciente",
    subtitle = "Accede a los datos, publicaciones e indicadores más actualizados",
    items,
    footerText = "Ver todas las actualizaciones",
    footerLink = "/comunidad/noticias"
}) {
    const defaultItems = [
        {
            id: 1,
            type: 'Indicador',
            title: 'Índice de Desarrollo Humano 2025',
            description: 'Nuevos datos sobre el desarrollo humano en Jalisco',
            date: '16 Oct 2025',
            icon: '📊',
            color: 'purple',
            link: '/sistemas/indicadores'
        },
        {
            id: 2,
            type: 'Publicación',
            title: 'Anuario Estadístico de Jalisco',
            description: 'Edición 2025 ya disponible para consulta',
            date: '14 Oct 2025',
            icon: '📚',
            color: 'blue',
            link: '/datos-abiertos/documentos'
        },
        {
            id: 3,
            type: 'Datos',
            title: 'Censo Económico Municipal',
            description: 'Actualización de datos económicos por municipio',
            date: '12 Oct 2025',
            icon: '💼',
            color: 'green',
            link: '/datos-abiertos/catalogo'
        },
        {
            id: 4,
            type: 'API',
            title: 'Nueva API de Datos Geoespaciales',
            description: 'Acceso programático a capas de información territorial',
            date: '10 Oct 2025',
            icon: '🔌',
            color: 'orange',
            link: '/datos-abiertos/apis'
        }
    ];

    const recentItems = (items && items.length > 0) ? items : defaultItems;

    const colorClasses = {
        purple: {
            bg: 'bg-purple-100',
            text: 'text-purple-700',
            border: 'border-purple-200',
            hover: 'hover:border-purple-400'
        },
        blue: {
            bg: 'bg-blue-100',
            text: 'text-blue-700',
            border: 'border-blue-200',
            hover: 'hover:border-blue-400'
        },
        green: {
            bg: 'bg-green-100',
            text: 'text-green-700',
            border: 'border-green-200',
            hover: 'hover:border-green-400'
        },
        orange: {
            bg: 'bg-orange-100',
            text: 'text-orange-700',
            border: 'border-orange-200',
            hover: 'hover:border-orange-400'
        }
    }

    return (
        <section id="reciente" className="py-16 bg-gradient-to-b from-gray-50 to-white scroll-mt-16">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        {title}
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        {subtitle}
                    </p>
                </div>

                <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {recentItems.map((item, index) => {
                        const colors = colorClasses[item.color] || colorClasses.purple
                        return (
                            <Link
                                key={item.id || index}
                                to={item.link}
                                className={`block bg-white border-2 ${colors.border} ${colors.hover} rounded-xl p-6 transition-all duration-200 hover:shadow-lg group`}
                            >
                                <div className="flex flex-col h-full">
                                    <div className={`inline-flex items-center justify-center w-16 h-16 ${colors.bg} rounded-lg mb-4 text-3xl`}>
                                        {item.icon}
                                    </div>
                                    <span className={`inline-block px-3 py-1 text-xs font-semibold ${colors.text} ${colors.bg} rounded-full mb-3 self-start`}>
                                        {item.type}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4 flex-grow">
                                        {item.description}
                                    </p>
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <span className="text-xs text-gray-500">{item.date}</span>
                                        <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>

                <div className="text-center mt-12">
                    <Link
                        to={footerLink}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors duration-200"
                    >
                        {footerText}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default RecentInfo
