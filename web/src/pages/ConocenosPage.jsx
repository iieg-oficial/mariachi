function ConocenosPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-purple-800 mb-6">Conócenos</h1>
            
            <div className="prose max-w-none">
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">¿Quiénes Somos?</h2>
                    <p className="text-gray-700 leading-relaxed">
                        El Instituto de Información Estadística y Geográfica de Jalisco (IIEG) es el organismo público 
                        descentralizado responsable de normar y coordinar los Sistemas Estatales de Información Estadística 
                        y Geográfica, así como de realizar las actividades que en estas materias demanden el desarrollo del Estado.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Misión</h2>
                    <p className="text-gray-700 leading-relaxed">
                        Producir, integrar y difundir información estadística y geográfica de calidad, oportuna y confiable, 
                        que contribuya a la toma de decisiones y al desarrollo integral del estado de Jalisco.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Visión</h2>
                    <p className="text-gray-700 leading-relaxed">
                        Ser el referente en materia de información estadística y geográfica en el estado de Jalisco, 
                        reconocidos por la calidad, oportunidad y utilidad de nuestros productos y servicios.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Valores</h2>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                        <li>Transparencia</li>
                        <li>Calidad</li>
                        <li>Objetividad</li>
                        <li>Profesionalismo</li>
                        <li>Innovación</li>
                    </ul>
                </section>
            </div>
        </div>
    )
}

export default ConocenosPage
