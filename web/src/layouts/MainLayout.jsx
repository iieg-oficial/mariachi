import { Outlet } from 'react-router';
import Navbar from '@components/Navbar';
import GlobalStyles from '@components/GlobalStyles';

const Header = () => {
    return (
        <Navbar />
    );
};

const Body = () => {
    return (
        <main id="main" className="h-full p-2 overflow-hidden">
            <Outlet />
        </main>
    );
};

const MainLayout = () => {
    return (
        <>
            <GlobalStyles />
            <div className="min-h-screen flex flex-col">
                <Header />
                <Body />
            </div>
        </>
    );
};

export default MainLayout;