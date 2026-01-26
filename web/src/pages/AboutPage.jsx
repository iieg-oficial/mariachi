function AboutPage() {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
                Acerca del IIEG
            </h1>
            
            <div className="card mb-6">
                <h2 className="text-2xl font-bold mb-4">Nuestra Misión</h2>
                <p className="text-gray-700 leading-relaxed">
                    El Instituto de Información Estadística y Geográfica de Jalisco (IIEG) 
                    tiene como misión generar, integrar y difundir información estadística y 
                    geográfica del estado de Jalisco, proporcionando datos confiables y 
                    oportunos que contribuyan a la toma de decisiones de gobierno, academia, 
                    sector privado y sociedad en general.
                </p>
            </div>
            
            <div className="card mb-6">
                <h2 className="text-2xl font-bold mb-4">Nuestra Visión</h2>
                <p className="text-gray-700 leading-relaxed">
                    Ser la institución líder en Jalisco en la generación y difusión de 
                    información estadística y geográfica, reconocida por su calidad, 
                    innovación y compromiso con la transparencia y el desarrollo del estado.
                </p>
            </div>
            
            <div className="card">
                <h2 className="text-2xl font-bold mb-4">Valores</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['Transparencia', 'Calidad', 'Innovación', 'Compromiso', 'Objetividad', 'Profesionalismo'].map((valor) => (
                        <li key={valor} className="flex items-center space-x-2">
                            <span className="text-primary-600">✓</span>
                            <span className="text-gray-700">{valor}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export default AboutPage
