import { useContext } from 'react';
import { Outlet } from 'react-router';
import Navbar from '@components/Navbar';
import Footer from '@components/Footer';
import GlobalContext from '@contexts/GlobalContext';

const MainLayout = () => {
    const { isMenuPreview } = useContext(GlobalContext);

    return (
        <div className="min-h-screen flex flex-col">
            {isMenuPreview && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#faad14', color: '#000', textAlign: 'center', padding: '8px 16px', fontWeight: 600, fontSize: 14 }}>
                    Modo vista previa del menú — este menú no está publicado
                </div>
            )}
            <div style={isMenuPreview ? { paddingTop: 37 } : undefined}>
                <Navbar />
            </div>
            <main id="main" className="flex-1 p-2 overflow-hidden">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default MainLayout;
