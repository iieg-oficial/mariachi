import MainLayout from '@layouts/MainLayout';
import HomeProvider from '@providers/HomeProvider';
import GlobalProvider from '@providers/GlobalProvider';

const MainProvider = () => {
    return (
        <GlobalProvider>
            <HomeProvider>
                <MainLayout />
            </HomeProvider>
        </GlobalProvider>
    );
}

export default MainProvider