import { Link } from 'react-router'

function ContabilidadGubernamental() {
    const recursos = [
        {
            id: 1,
            titulo: 'Ley General de Contabilidad',
            descripcion: 'Marco normativo de la contabilidad gubernamental',
            icon: '⚖️',
            link: '/transparencia/contabilidad/ley'
        },
        {
            id: 2,
            titulo: 'Armonización Contable',
            descripcion: 'Información sobre procesos de armonización',
            icon: '🔄',
            link: '/transparencia/contabilidad/armonizacion'
        },
        {
            id: 3,
            titulo: 'Estados Financieros',
            descripcion: 'Consulta los estados financieros publicados',
            icon: '📊',
            link: '/transparencia/contabilidad/estados-financieros'
        },
        {
            id: 4,
            titulo: 'Indicadores Financieros',
            descripcion: 'Indicadores de gestión y desempeño financiero',
            icon: '📈',
            link: '/transparencia/contabilidad/indicadores'
        }
    ]

    return (
        <section id="contabilidad" className="py-16 bg-gradient-to-b from-gray-50 to-white scroll-mt-16">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                            Contabilidad Gubernamental
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Información financiera y contable del IIEG en cumplimiento con la 
                            Ley General de Contabilidad Gubernamental
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-12">
                        {recursos.map((recurso) => (
                            <Link
                                key={recurso.id}
                                to={recurso.link}
                                className="group bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-green-400 hover:shadow-lg transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="text-4xl flex-shrink-0">{recurso.icon}</div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">
                                            {recurso.titulo}
                                        </h3>
                                        <p className="text-gray-600 text-sm mb-3">
                                            {recurso.descripcion}
                                        </p>
                                        <div className="flex items-center text-green-700 font-medium text-sm">
                                            Consultar
                                            <svg className="w-4 h-4 ml-1 group-hover:ml-2 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="md:w-1/3 text-center">
                                <div className="inline-block bg-white rounded-full p-6 shadow-lg mb-4">
                                    <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    Cuenta Pública
                                </h3>
                            </div>
                            <div className="md:w-2/3">
                                <h4 className="text-xl font-bold text-gray-900 mb-3">
                                    Transparencia en el ejercicio del gasto
                                </h4>
                                <p className="text-gray-700 mb-4">
                                    Consulta la Cuenta Pública del IIEG que contiene información detallada sobre 
                                    el ejercicio del presupuesto, estados financieros, y el cumplimiento de los 
                                    objetivos y metas institucionales.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <Link
                                        to="/transparencia/cuenta-publica"
                                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-200"
                                    >
                                        Ver Cuenta Pública
                                    </Link>
                                    <Link
                                        to="/transparencia/contabilidad"
                                        className="px-6 py-3 border-2 border-green-600 text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors duration-200"
                                    >
                                        Más información
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 grid md:grid-cols-3 gap-6">
                        <div className="text-center p-6">
                            <div className="text-3xl mb-3">💰</div>
                            <h4 className="font-semibold text-gray-900 mb-2">Presupuesto</h4>
                            <p className="text-sm text-gray-600">
                                Información sobre el presupuesto autorizado y ejercido
                            </p>
                        </div>
                        <div className="text-center p-6">
                            <div className="text-3xl mb-3">📋</div>
                            <h4 className="font-semibold text-gray-900 mb-2">Reportes</h4>
                            <p className="text-sm text-gray-600">
                                Reportes trimestrales y anuales de situación financiera
                            </p>
                        </div>
                        <div className="text-center p-6">
                            <div className="text-3xl mb-3">✅</div>
                            <h4 className="font-semibold text-gray-900 mb-2">Cumplimiento</h4>
                            <p className="text-sm text-gray-600">
                                Cumplimiento de la normatividad en contabilidad
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ContabilidadGubernamental
