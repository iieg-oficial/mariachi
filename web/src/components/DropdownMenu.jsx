import { Link, useNavigate, useLocation } from 'react-router';
import { useState, useRef, useEffect } from 'react';

function DropdownMenu({ item, isMobile = false, menuStyle = {}, onItemClick }) {
    const [isOpen, setIsOpen] = useState(false);
    const timeoutRef = useRef(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleMouseEnter = () => {
        if (!isMobile) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            setIsOpen(true);
        }
    };

    const handleMouseLeave = () => {
        if (!isMobile) {
            timeoutRef.current = setTimeout(() => {
                setIsOpen(false);
            }, 300);
        }
    };

    const handleClick = () => {
        if (isMobile) {
            setIsOpen(!isOpen);
        }
    };

    const handleSubmenuClick = (e, path) => {
        if (path.startsWith('/#')) {
            e.preventDefault();
            const id = path.substring(2); 

            if (location.pathname === '/') {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                navigate('/');
                setTimeout(() => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100);
            }
        }
        
        setIsOpen(false);
        if (onItemClick) {
            onItemClick();
        }
    };

    if (!item.submenu) {
        if (item.disabled) {
            return (
                <span
                    className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-200 cursor-not-allowed rounded-sm whitespace-nowrap"
                    title="No disponible"
                >
                    {item.name}
                </span>
            );
        }
        return (
            <Link
                to={item.path}
                onClick={onItemClick}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-800 hover:bg-purple-700 transition-colors duration-200 rounded-sm whitespace-nowrap"
                style={menuStyle}
            >
                {item.name}
            </Link>
        );
    }

    if (item.disabled) {
        return (
            <span
                className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-200 cursor-not-allowed rounded-sm whitespace-nowrap flex items-center gap-1"
                title="No disponible"
            >
                {item.name}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </span>
        );
    }

    return (
        <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            ref={dropdownRef}
        >
            <button
                onClick={handleClick}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-800 hover:bg-purple-700 transition-colors duration-200 rounded-sm whitespace-nowrap flex items-center gap-1"
                style={menuStyle}
            >
                {item.name}
                <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className={`
                    ${isMobile ? 'relative mt-2 w-full' : 'absolute left-0 mt-1 w-80 z-50'}
                    bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-y-auto
                `}>
                    <div className="py-2">
                        {item.submenu.map((subItem, index) => {
                            if (subItem.disabled) {
                                return (
                                    <span
                                        key={index}
                                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                                        title="No disponible"
                                    >
                                        <span className="text-lg flex-shrink-0 opacity-50">{subItem.icon}</span>
                                        <span className="flex-1">{subItem.name}</span>
                                    </span>
                                );
                            }

                            const isHashLink = subItem.path.startsWith('/#');

                            if (isHashLink) {
                                return (
                                    <a
                                        key={index}
                                        href={subItem.path}
                                        onClick={(e) => handleSubmenuClick(e, subItem.path)}
                                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-800 transition-colors"
                                        style={menuStyle}
                                    >
                                        <span className="text-lg flex-shrink-0">{subItem.icon}</span>
                                        <span className="flex-1">{subItem.name}</span>
                                    </a>
                                );
                            }

                            return (
                                <Link
                                    key={index}
                                    to={subItem.path}
                                    onClick={(e) => handleSubmenuClick(e, subItem.path)}
                                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-800 transition-colors"
                                    style={menuStyle}
                                >
                                    <span className="text-lg flex-shrink-0">{subItem.icon}</span>
                                    <span className="flex-1">{subItem.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DropdownMenu;
