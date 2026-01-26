import { useGlobal } from '@hooks/useGlobal'

function Footer() {
    const currentYear = new Date().getFullYear()
    const { footerConfig } = useGlobal()

    const parseFontWeight = (weightString) => {
        if (!weightString) return undefined;
        const [weight, style] = weightString.split('-');
        return { weight: parseInt(weight), style };
    };

    const textFontData = parseFontWeight(footerConfig?.textFontWeight);
    const linkFontData = parseFontWeight(footerConfig?.linkFontWeight);

    const textStyle = {
        fontFamily: footerConfig?.textFont ? `'${footerConfig.textFont}', sans-serif` : undefined,
        fontWeight: textFontData?.weight || undefined,
        fontStyle: textFontData?.style !== 'normal' ? textFontData?.style : undefined
    };

    const linkStyle = {
        fontFamily: footerConfig?.linkFont ? `'${footerConfig.linkFont}', sans-serif` : undefined,
        fontWeight: linkFontData?.weight || undefined,
        fontStyle: linkFontData?.style !== 'normal' ? linkFontData?.style : undefined
    };

    const bgColor = footerConfig?.backgroundColor || '#1f2937';

    return (
        <footer style={{ backgroundColor: bgColor }} className="text-white py-8 mt-auto">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-4" style={textStyle}>IIEG Portal</h3>
                        <p className="text-gray-300" style={textStyle}>
                            {footerConfig?.address || 'Instituto de Información Estadística y Geográfica de Jalisco'}
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-lg mb-4" style={textStyle}>Enlaces</h3>
                        <ul className="space-y-2 text-gray-300">
                            <li><a href="/" style={linkStyle} className="hover:text-white transition-colors">Inicio</a></li>
                            <li><a href="/about" style={linkStyle} className="hover:text-white transition-colors">Acerca de</a></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-lg mb-4" style={textStyle}>Contacto</h3>
                        {footerConfig?.phone && (
                            <p className="text-gray-300 mb-2" style={textStyle}>
                                Tel: {footerConfig.phone}
                            </p>
                        )}
                        <p className="text-gray-300" style={textStyle}>
                            {footerConfig?.email || 'admin@iieg.jalisco.gob.mx'}
                        </p>
                    </div>
                </div>

                <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
                    <p style={textStyle}>
                        {footerConfig?.copyrightText || `© ${currentYear} IIEG. Todos los derechos reservados.`}
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
