import { Outlet } from 'react-router';
import Navbar from '@components/Navbar';
import Footer from '@components/Footer';

const MainLayout = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main id="main" className="flex-1 p-2 overflow-hidden">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default MainLayout;
