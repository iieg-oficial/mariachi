function DatosAbiertosPage() {
    const datasets = [
        { title: 'Población y Demografía', formato: 'CSV, JSON, XML', actualizacion: 'Trimestral' },
        { title: 'Economía y Empleo', formato: 'CSV, JSON, XML', actualizacion: 'Mensual' },
        { title: 'Educación', formato: 'CSV, JSON, XML', actualizacion: 'Anual' },
        { title: 'Salud', formato: 'CSV, JSON, XML', actualizacion: 'Mensual' },
        { title: 'Seguridad Pública', formato: 'CSV, JSON, XML', actualizacion: 'Mensual' },
        { title: 'Medio Ambiente', formato: 'CSV, JSON, XML', actualizacion: 'Trimestral' },
    ]

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-purple-800 mb-6">Datos Abiertos y Documentación</h1>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
                <p className="text-blue-800">
                    <strong>Datos Abiertos:</strong> Información pública disponible para su libre uso, reutilización 
                    y redistribución por cualquier persona.
                </p>
            </div>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Conjuntos de Datos Disponibles</h2>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg shadow-md">
                        <thead className="bg-purple-800 text-white">
                            <tr>
                                <th className="px-6 py-3 text-left">Conjunto de Datos</th>
                                <th className="px-6 py-3 text-left">Formato</th>
                                <th className="px-6 py-3 text-left">Actualización</th>
                                <th className="px-6 py-3 text-left">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {datasets.map((dataset, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-800">{dataset.title}</td>
                                    <td className="px-6 py-4 text-gray-600">{dataset.formato}</td>
                                    <td className="px-6 py-4 text-gray-600">{dataset.actualizacion}</td>
                                    <td className="px-6 py-4">
                                        <button className="text-purple-800 hover:text-purple-600 font-medium">
                                            Descargar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Documentación</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a href="#" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-purple-800 mb-2">📘 Guía de Uso</h3>
                        <p className="text-gray-600 text-sm">Aprende a utilizar nuestros datos abiertos</p>
                    </a>
                    <a href="#" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-purple-800 mb-2">📄 API Documentación</h3>
                        <p className="text-gray-600 text-sm">Integra nuestros datos en tus aplicaciones</p>
                    </a>
                    <a href="#" className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-purple-800 mb-2">📋 Licencias</h3>
                        <p className="text-gray-600 text-sm">Términos de uso de los datos</p>
                    </a>
                </div>
            </section>
        </div>
    )
}

export default DatosAbiertosPage
