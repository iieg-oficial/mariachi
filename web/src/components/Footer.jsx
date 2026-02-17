function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="bg-gray-800 text-white py-8 mt-auto">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-4">IIEG Portal</h3>
                        <p className="text-gray-300">
                            Instituto de Información Estadística y Geográfica de Jalisco
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-lg mb-4">Enlaces</h3>
                        <ul className="space-y-2 text-gray-300">
                            <li><a href="/" className="hover:text-white transition-colors">Inicio</a></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-lg mb-4">Contacto</h3>
                        <p className="text-gray-300">admin@iieg.jalisco.gob.mx</p>
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
                    <p>&copy; {currentYear} IIEG. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
