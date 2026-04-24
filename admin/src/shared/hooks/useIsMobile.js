import { Grid } from 'antd';

const { useBreakpoint } = Grid;

export default function useIsMobile() {
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const isTablet = screens.md && !screens.lg;
    const isDesktop = !!screens.lg;
    return { isMobile, isTablet, isDesktop, screens };
}
