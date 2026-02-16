function SistemasPage() {
    const sistemas = [
        {
            name: 'Sistema de Información Geográfica',
            description: 'Plataforma para consulta y análisis de información geoespacial del estado de Jalisco.',
            icon: '🗺️',
            url: '/mapalab'
        },
        {
            name: 'Sistema Estatal de Información Estadística',
            description: 'Base de datos con indicadores demográficos, económicos y sociales de Jalisco.',
            icon: '📊'
        },
        {
            name: 'Observatorio de Desarrollo Regional',
            description: 'Herramienta para el monitoreo y análisis del desarrollo regional.',
            icon: '📈'
        },
        {
            name: 'Sistema de Información Municipal',
            description: 'Información detallada de los 125 municipios de Jalisco.',
            icon: '🏛️'
        },
    ]

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-purple-800 mb-6">Sistemas de Información</h1>

            <p className="text-gray-700 text-lg mb-8">
                Consulta nuestros sistemas de información estadística y <a href="/mapalab" className="text-purple-800 hover:text-purple-600 underline">geográfica</a> para acceder a datos
                confiables y actualizados sobre el estado de Jalisco.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sistemas.map((sistema, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div className="text-4xl mb-4">{sistema.icon}</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">{sistema.name}</h3>
                        <p className="text-gray-600">{sistema.description}</p>
                        {sistema.url && (
                            <a href={sistema.url} className="mt-4 inline-block px-4 py-2 bg-purple-800 text-white rounded hover:bg-purple-700 transition-colors">
                                Acceder al Sistema
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default SistemasPage
