import { Link } from 'react-router'
import { useState } from 'react'
import { useGlobal } from '@hooks/useGlobal'
import DropdownMenu from './DropdownMenu'

function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { navigation, headerConfig, loading } = useGlobal()

    const navStyle = {
        backgroundColor: headerConfig?.backgroundColor || '#ffffff'
    };

    const textStyle = {
        color: headerConfig?.textColor || '#1f2937'
    };

    const parseFontWeight = (weightString) => {
        if (!weightString) return undefined;
        const [weight, style] = weightString.split('-');
        return { weight: parseInt(weight), style };
    };

    const titleFontData = parseFontWeight(headerConfig?.titleFontWeight);
    const subtitleFontData = parseFontWeight(headerConfig?.subtitleFontWeight);
    const menuFontData = parseFontWeight(headerConfig?.menuFontWeight);

    const titleStyle = {
        ...textStyle,
        color: headerConfig?.titleColor || textStyle.color,
        fontFamily: headerConfig?.titleFont ? `'${headerConfig.titleFont}', sans-serif` : undefined,
        fontWeight: titleFontData?.weight || undefined,
        fontStyle: titleFontData?.style !== 'normal' ? titleFontData?.style : undefined
    };

    const subtitleStyle = {
        ...textStyle,
        color: headerConfig?.subtitleColor || textStyle.color,
        fontFamily: headerConfig?.subtitleFont ? `'${headerConfig.subtitleFont}', sans-serif` : undefined,
        fontWeight: subtitleFontData?.weight || undefined,
        fontStyle: subtitleFontData?.style !== 'normal' ? subtitleFontData?.style : undefined
    };

    const menuStyle = {
        ...textStyle,
        fontFamily: headerConfig?.menuFont ? `'${headerConfig.menuFont}', sans-serif` : undefined,
        fontWeight: menuFontData?.weight || undefined,
        fontStyle: menuFontData?.style !== 'normal' ? menuFontData?.style : undefined
    };

    if (loading) {
        return (
            <nav style={navStyle} className="shadow-md sticky top-0 z-50">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/" className="flex items-center space-x-3">
                            <img
                                src={headerConfig?.logoUrl || '/logo_iieg.svg'}
                                alt="IIEG"
                                className="h-12 w-auto"
                            />
                            <div className="flex flex-col">
                                {headerConfig?.showTitle && (
                                    <span className="font-bold text-lg leading-tight" style={titleStyle}>
                                        {headerConfig?.title || 'IIEG'}
                                    </span>
                                )}
                                {headerConfig?.showSubtitle && headerConfig?.subtitle && (
                                    <span className="text-xs opacity-70" style={subtitleStyle}>
                                        {headerConfig.subtitle}
                                    </span>
                                )}
                            </div>
                        </Link>
                        <div className="text-gray-400">Cargando menú...</div>
                    </div>
                </div>
            </nav>
        );
    }

    return (
        <nav style={navStyle} className="shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center space-x-3">
                        <img
                            src={headerConfig?.logoUrl || '/logo_iieg.svg'}
                            alt="IIEG"
                            className="h-12 w-auto"
                        />
                        <div className="flex flex-col">
                            {headerConfig?.showTitle && (
                                <span className="font-bold text-lg leading-tight" style={titleStyle}>
                                    {headerConfig?.title || 'IIEG'}
                                </span>
                            )}
                            {headerConfig?.showSubtitle && headerConfig?.subtitle && (
                                <span className="text-xs opacity-70" style={subtitleStyle}>
                                    {headerConfig.subtitle}
                                </span>
                            )}
                        </div>
                    </Link>

                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 rounded-md hover:bg-gray-100"
                        style={textStyle}
                        aria-label="Menú"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {mobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>

                    <div className="hidden lg:flex items-center space-x-1">
                        {navigation.menuItems.map((item) => (
                            <DropdownMenu
                                key={item.id}
                                item={item}
                                isMobile={false}
                                menuStyle={menuStyle}
                            />
                        ))}
                    </div>
                </div>

                {mobileMenuOpen && (
                    <div className="lg:hidden py-4 border-t border-gray-200">
                        <div className="flex flex-col space-y-2">
                            {navigation.menuItems.map((item) => (
                                <DropdownMenu
                                    key={item.id}
                                    item={item}
                                    isMobile={true}
                                    menuStyle={menuStyle}
                                    onItemClick={() => setMobileMenuOpen(false)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    )
}

export default Navbar
