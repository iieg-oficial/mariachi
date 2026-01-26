import { Link } from 'react-router'

function Licitaciones() {
    const licitacionesRecientes = [
        {
            id: 1,
            numero: 'LPN-IIEG-2025-012',
            titulo: 'Adquisición de equipos de cómputo',
            fecha: '20 Oct 2025',
            estado: 'En proceso',
            estadoColor: 'blue'
        },
        {
            id: 2,
            numero: 'LPN-IIEG-2025-011',
            titulo: 'Servicio de desarrollo de software',
            fecha: '15 Oct 2025',
            estado: 'Publicada',
            estadoColor: 'green'
        },
        {
            id: 3,
            numero: 'LPN-IIEG-2025-010',
            titulo: 'Mantenimiento de infraestructura TI',
            fecha: '10 Oct 2025',
            estado: 'Adjudicada',
            estadoColor: 'gray'
        }
    ]

    const estadoColors = {
        blue: 'bg-blue-100 text-blue-800',
        green: 'bg-green-100 text-green-800',
        gray: 'bg-gray-100 text-gray-800'
    }

    return (
        <section id="licitaciones" className="py-16 bg-white scroll-mt-16">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                            Licitaciones y Adquisiciones
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Consulta las convocatorias, bases y resultados de los procesos de adquisición
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="bg-gray-50 rounded-xl p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-6">
                                    Licitaciones Recientes
                                </h3>
                                <div className="space-y-4">
                                    {licitacionesRecientes.map((licitacion) => (
                                        <div
                                            key={licitacion.id}
                                            className="bg-white rounded-lg p-5 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200"
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                            {licitacion.numero}
                                                        </span>
                                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${estadoColors[licitacion.estadoColor]}`}>
                                                            {licitacion.estado}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-semibold text-gray-900 mb-1">
                                                        {licitacion.titulo}
                                                    </h4>
                                                    <p className="text-sm text-gray-500">
                                                        Publicado: {licitacion.fecha}
                                                    </p>
                                                </div>
                                                <Link
                                                    to={`/transparencia/licitaciones/${licitacion.id}`}
                                                    className="flex-shrink-0 text-purple-600 hover:text-purple-700"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6">
                                    <Link
                                        to="/transparencia/licitaciones"
                                        className="block text-center px-6 py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-800 transition-colors duration-200"
                                    >
                                        Ver todas las licitaciones
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                                <div className="text-3xl mb-4">📋</div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">
                                    ¿Cómo participar?
                                </h3>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-600 font-bold">1.</span>
                                        <span>Revisa las convocatorias publicadas</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-600 font-bold">2.</span>
                                        <span>Descarga las bases de licitación</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-600 font-bold">3.</span>
                                        <span>Presenta tu propuesta en tiempo y forma</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-purple-600 font-bold">4.</span>
                                        <span>Consulta los resultados</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">
                                    Enlaces Útiles
                                </h3>
                                <div className="space-y-3">
                                    <a
                                        href="https://compranet.hacienda.gob.mx"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <span className="text-sm font-medium text-gray-900">CompraNet</span>
                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                    <Link
                                        to="/transparencia/plan-adquisiciones"
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <span className="text-sm font-medium text-gray-900">Plan Anual</span>
                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                    <Link
                                        to="/transparencia/normatividad"
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <span className="text-sm font-medium text-gray-900">Normatividad</span>
                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Licitaciones
