function TransparenciaPage() {
    const documentos = [
        { categoria: 'Informes Financieros', docs: ['Presupuesto 2025', 'Estado Financiero Q3 2025', 'Informe Anual 2024'] },
        { categoria: 'Normatividad', docs: ['Ley de Transparencia', 'Reglamento Interno', 'Código de Ética'] },
        { categoria: 'Contratos y Licitaciones', docs: ['Licitaciones Activas', 'Contratos 2025', 'Proveedores'] },
        { categoria: 'Estructura Organizacional', docs: ['Organigrama', 'Directorio', 'Funciones'] },
    ]

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-purple-800 mb-6">Transparencia</h1>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-8">
                <p className="text-yellow-800">
                    En cumplimiento con la Ley de Transparencia y Acceso a la Información Pública, 
                    ponemos a su disposición la siguiente información institucional.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {documentos.map((categoria, index) => (
                    <section key={index} className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                            <span className="text-purple-800 mr-2">📁</span>
                            {categoria.categoria}
                        </h2>
                        <ul className="space-y-2">
                            {categoria.docs.map((doc, idx) => (
                                <li key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                                    <span className="text-gray-700">{doc}</span>
                                    <button className="text-purple-800 hover:text-purple-600 font-medium text-sm">
                                        Descargar PDF
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>

            <section className="mt-8 bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Solicitud de Información</h2>
                <p className="text-gray-700 mb-4">
                    Ejerce tu derecho de acceso a la información pública a través del Sistema de Solicitudes.
                </p>
                <button className="px-6 py-3 bg-purple-800 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Realizar Solicitud de Información
                </button>
            </section>
        </div>
    )
}

export default TransparenciaPage
