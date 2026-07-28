import { act, useMemo } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { Button } from 'antd';

const breakpointMock = vi.hoisted(() => ({
    value: { isMobile: false, isTablet: false, isDesktop: true },
}));

vi.mock('@shared/hooks/useIsMobile', () => ({
    default: () => breakpointMock.value,
}));

beforeEach(() => {
    breakpointMock.value = { isMobile: false, isTablet: false, isDesktop: true };
});
import FullscreenLayout from '@app/FullscreenLayout';
import { useFullscreenHeader } from '@app/fullscreenHeader';

function DemoPage() {
    useFullscreenHeader({ title: 'Título de prueba', backTo: '/origen' });
    return <div>contenido</div>;
}

const renderAt = (path) => {
    const router = createMemoryRouter(
        [{ element: <FullscreenLayout />, children: [{ path: '/tabla', element: <DemoPage /> }] }],
        { initialEntries: [path] },
    );
    return render(<RouterProvider router={router} />);
};

describe('FullscreenLayout responsive', () => {
    it('en desktop deja la barra en una sola fila', () => {
        breakpointMock.value = { isMobile: false, isTablet: false, isDesktop: true };
        const { container } = renderAt('/tabla');
        const topbar = container.querySelector('.mariachi-topbar');
        expect(topbar.style.flexDirection).toBe('row');
        expect(topbar.style.flexWrap).toBe('nowrap');
    });

    it('en tablet parte la barra en dos filas', () => {
        breakpointMock.value = { isMobile: false, isTablet: true, isDesktop: false };
        const { container } = renderAt('/tabla');
        expect(container.querySelector('.mariachi-topbar').style.flexDirection).toBe('column');
    });

    it('en movil parte la barra en dos filas', () => {
        breakpointMock.value = { isMobile: true, isTablet: false, isDesktop: false };
        const { container } = renderAt('/tabla');
        expect(container.querySelector('.mariachi-topbar').style.flexDirection).toBe('column');
    });
});

describe('FullscreenLayout', () => {
    it('muestra marca, regresar y el titulo que declara la pagina', () => {
        renderAt('/tabla');
        expect(screen.getByAltText('IIEG')).toBeInTheDocument();
        expect(screen.getByText('Mariachi')).toBeInTheDocument();
        expect(screen.getByLabelText('Regresar')).toBeInTheDocument();
        expect(screen.getByText('Título de prueba')).toBeInTheDocument();
    });

    it('renderiza el contenido de la pagina sin el sider', () => {
        const { container } = renderAt('/tabla');
        expect(screen.getByText('contenido')).toBeInTheDocument();
        expect(container.querySelector('.ant-layout-sider')).not.toBeInTheDocument();
    });

    it('las acciones de la barra llevan la clase que el CSS oscuro ataca', () => {
        const ConAcciones = () => {
            const extra = useMemo(() => (
                <>
                    <Button type="text" aria-label="accion-texto">A</Button>
                    <Button type="default" aria-label="accion-outline">B</Button>
                </>
            ), []);
            useFullscreenHeader({ title: 'x', extra });
            return null;
        };
        const router = createMemoryRouter(
            [{ element: <FullscreenLayout />, children: [{ path: '/x', element: <ConAcciones /> }] }],
            { initialEntries: ['/x'] },
        );
        const { container } = render(<RouterProvider router={router} />);

        const topbar = container.querySelector('.mariachi-topbar');
        expect(topbar).toBeInTheDocument();
        expect(topbar.querySelector('[aria-label="accion-texto"]').className)
            .toContain('ant-btn-variant-text');
        expect(topbar.querySelector('[aria-label="accion-outline"]').className)
            .toContain('ant-btn-variant-outlined');
        expect(container.querySelector('style').textContent)
            .toContain('.ant-btn.ant-btn-variant-text');
    });

    it('cambia de pagina aunque el Outlet este memoizado', async () => {
        const OtraPagina = () => {
            useFullscreenHeader({ title: 'Otra' });
            return <div>otro contenido</div>;
        };
        const router = createMemoryRouter(
            [{
                element: <FullscreenLayout />,
                children: [
                    { path: '/tabla', element: <DemoPage /> },
                    { path: '/otra', element: <OtraPagina /> },
                ],
            }],
            { initialEntries: ['/tabla'] },
        );
        render(<RouterProvider router={router} />);
        expect(screen.getByText('contenido')).toBeInTheDocument();

        await act(async () => { await router.navigate('/otra'); });

        expect(screen.getByText('otro contenido')).toBeInTheDocument();
        expect(screen.getByText('Otra')).toBeInTheDocument();
        expect(screen.queryByText('contenido')).not.toBeInTheDocument();
    });
});
