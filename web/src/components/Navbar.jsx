import { Link } from 'react-router'
import { useState } from 'react'
import { useGlobal } from '@hooks/useGlobal'
import DropdownMenu from './DropdownMenu'

function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { navigation, loading } = useGlobal()

    if (loading) {
        return (
            <nav className="bg-white shadow-md sticky top-0 z-50">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/" className="flex items-center space-x-3">
                            <img src="/logo_iieg.svg" alt="IIEG" className="h-12 w-auto" />
                            <span className="font-bold text-lg text-gray-800">IIEG</span>
                        </Link>
                        <div className="text-gray-400">Cargando menú...</div>
                    </div>
                </div>
            </nav>
        );
    }

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center space-x-3">
                        <img src="/logo_iieg.svg" alt="IIEG" className="h-12 w-auto" />
                        <span className="font-bold text-lg text-gray-800">IIEG</span>
                    </Link>

                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 rounded-md hover:bg-gray-100 text-gray-800"
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
