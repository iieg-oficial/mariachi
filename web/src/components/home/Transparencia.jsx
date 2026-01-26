import { Link } from 'react-router'

function Transparencia() {
    return (
        <section id="transparencia" className="py-16 bg-gray-50 scroll-mt-16">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-8">
                        <Link
                            to="/transparencia"
                            className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-purple-400"
                        >
                            <div className="p-8">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center text-3xl">
                                        🔍
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                                            Transparencia
                                        </h3>
                                        <p className="text-sm text-gray-600">Información pública</p>
                                    </div>
                                </div>
                                <p className="text-gray-600 mb-6">
                                    Consulta información sobre presupuesto, adquisiciones, estructura organizacional 
                                    y todo lo relacionado con las obligaciones de transparencia del IIEG.
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Obligaciones de transparencia
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Presupuesto y finanzas
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Estructura organizacional
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center text-purple-700 font-semibold group-hover:gap-2 transition-all">
                                    Ir a Transparencia
                                    <svg className="w-5 h-5 ml-1 group-hover:ml-2 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </div>
                            </div>
                            <div className="h-2 bg-gradient-to-r from-purple-600 to-purple-400"></div>
                        </Link>

                        <Link
                            to="/transparencia/unidad"
                            className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-blue-400"
                        >
                            <div className="p-8">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center text-3xl">
                                        👥
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                            Unidad de Transparencia
                                        </h3>
                                        <p className="text-sm text-gray-600">Solicitudes y atención</p>
                                    </div>
                                </div>
                                <p className="text-gray-600 mb-6">
                                    Contacta con la Unidad de Transparencia para realizar solicitudes de información 
                                    pública o presentar consultas sobre el ejercicio de tus derechos.
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Solicitudes de información
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Recursos de revisión
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Contacto directo
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center text-blue-700 font-semibold group-hover:gap-2 transition-all">
                                    Contactar
                                    <svg className="w-5 h-5 ml-1 group-hover:ml-2 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </div>
                            </div>
                            <div className="h-2 bg-gradient-to-r from-blue-600 to-blue-400"></div>
                        </Link>
                    </div>

                    <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
                        <div className="flex items-start gap-4">
                            <svg className="w-6 h-6 text-purple-700 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Tu derecho a saber</h4>
                                <p className="text-sm text-gray-700">
                                    El acceso a la información pública es un derecho fundamental. El IIEG está comprometido 
                                    con la transparencia y la rendición de cuentas. Toda persona puede solicitar información 
                                    sin necesidad de justificar su uso.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Transparencia
