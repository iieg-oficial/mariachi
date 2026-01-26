function ComunidadPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-purple-800 mb-6">Comunidad</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">📢 Noticias y Eventos</h2>
                    <div className="space-y-4">
                        <article className="border-b pb-4">
                            <h3 className="font-semibold text-gray-800 mb-2">Actualización de Datos Demográficos</h3>
                            <p className="text-sm text-gray-600 mb-2">15 de Octubre, 2025</p>
                            <p className="text-gray-700">Nueva actualización de datos demográficos disponible...</p>
                        </article>
                        <article className="border-b pb-4">
                            <h3 className="font-semibold text-gray-800 mb-2">Taller de Datos Abiertos</h3>
                            <p className="text-sm text-gray-600 mb-2">10 de Octubre, 2025</p>
                            <p className="text-gray-700">Únete a nuestro taller sobre el uso de datos abiertos...</p>
                        </article>
                    </div>
                </section>

                <section className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">💬 Foros y Discusiones</h2>
                    <p className="text-gray-700 mb-4">
                        Participa en nuestros foros de discusión sobre temas de información estadística y geográfica.
                    </p>
                    <button className="w-full px-4 py-2 bg-purple-800 text-white rounded hover:bg-purple-700 transition-colors">
                        Acceder a Foros
                    </button>
                </section>

                <section className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">🎓 Capacitación</h2>
                    <p className="text-gray-700 mb-4">
                        Consulta nuestros cursos y talleres sobre análisis de datos y sistemas de información.
                    </p>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                        <li>Introducción a SIG</li>
                        <li>Análisis Estadístico Básico</li>
                        <li>Datos Abiertos y APIs</li>
                        <li>Visualización de Datos</li>
                    </ul>
                </section>

                <section className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">📧 Contacto</h2>
                    <p className="text-gray-700 mb-4">
                        ¿Tienes preguntas o comentarios? Contáctanos:
                    </p>
                    <div className="space-y-2 text-gray-700">
                        <p><strong>Email:</strong> contacto@iieg.gob.mx</p>
                        <p><strong>Teléfono:</strong> 33 1234 5678</p>
                        <p><strong>Dirección:</strong> Guadalajara, Jalisco</p>
                    </div>
                </section>
            </div>
        </div>
    )
}

export default ComunidadPage
