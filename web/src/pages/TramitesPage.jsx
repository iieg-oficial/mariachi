function TramitesPage() {
    const tramites = [
        {
            nombre: 'Solicitud de Datos Estadísticos',
            descripcion: 'Solicita datos estadísticos específicos no disponibles en el portal.',
            tiempo: '5-10 días hábiles',
            costo: 'Gratuito'
        },
        {
            nombre: 'Certificación de Documentos',
            descripcion: 'Obtén certificación oficial de documentos geográficos o estadísticos.',
            tiempo: '3-5 días hábiles',
            costo: '$200 MXN'
        },
        {
            nombre: 'Capacitación Institucional',
            descripcion: 'Solicita capacitación en sistemas de información para tu institución.',
            tiempo: '15-20 días hábiles',
            costo: 'Variable'
        },
        {
            nombre: 'Acceso a Cartografía Digital',
            descripcion: 'Solicita acceso a mapas y bases cartográficas digitales.',
            tiempo: '2-3 días hábiles',
            costo: 'Gratuito'
        },
    ]

    const servicios = [
        {
            nombre: 'Asesoría Técnica',
            descripcion: 'Recibe asesoría técnica en análisis estadístico y cartográfico.',
            icono: '👨‍💼'
        },
        {
            nombre: 'Consultoría',
            descripcion: 'Servicios de consultoría especializada en información geográfica.',
            icono: '📊'
        },
        {
            nombre: 'Biblioteca Digital',
            descripcion: 'Acceso a publicaciones, investigaciones y documentos técnicos.',
            icono: '📚'
        },
        {
            nombre: 'Sala de Consulta',
            descripcion: 'Espacio equipado para consulta de información especializada.',
            icono: '🖥️'
        },
    ]

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-purple-800 mb-6">Trámites y Servicios</h1>
            
            <section className="mb-12">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">📋 Trámites Disponibles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tramites.map((tramite, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                            <h3 className="text-xl font-semibold text-gray-800 mb-3">{tramite.nombre}</h3>
                            <p className="text-gray-600 mb-4">{tramite.descripcion}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                <div>
                                    <span className="text-gray-500">Tiempo:</span>
                                    <p className="font-medium text-gray-700">{tramite.tiempo}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Costo:</span>
                                    <p className="font-medium text-gray-700">{tramite.costo}</p>
                                </div>
                            </div>
                            <button className="w-full px-4 py-2 bg-purple-800 text-white rounded hover:bg-purple-700 transition-colors">
                                Iniciar Trámite
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">🛠️ Servicios</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {servicios.map((servicio, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
                            <div className="text-5xl mb-4">{servicio.icono}</div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">{servicio.nombre}</h3>
                            <p className="text-gray-600 text-sm mb-4">{servicio.descripcion}</p>
                            <button className="text-purple-800 hover:text-purple-600 font-medium text-sm">
                                Más información →
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-12 bg-purple-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">ℹ️ Información Importante</h2>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Todos los trámites requieren identificación oficial vigente</li>
                    <li>Los tiempos de respuesta son estimados y pueden variar</li>
                    <li>Algunos trámites pueden realizarse en línea</li>
                    <li>Para más información, contacta a nuestro centro de atención</li>
                </ul>
            </section>
        </div>
    )
}

export default TramitesPage
