import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TarjetitaEditor from '@features/mapalab-layers/components/layersEditor/TarjetitaEditor';

const CAMPOS = [{ name: 'nombre', type: 'string' }, { name: 'turno', type: 'string' }];
const CONFIG = { headerField: 'nombre', list: [{ label: 'Turno', field: 'turno' }] };

const montar = (value, props = {}) => {
    const onChange = props.onChange || vi.fn();
    const vista = render(
        <TarjetitaEditor value={value} onChange={onChange} availableFields={CAMPOS} {...props} onChange={onChange} />,
    );
    return { ...vista, onChange };
};

describe('TarjetitaEditor', () => {
    it('con la tarjetita vacía muestra solo la llamada a plantillas', () => {
        montar(null);
        expect(screen.getByText('Esta capa todavía no tiene tarjetita')).toBeInTheDocument();
        expect(screen.queryByText('Configuración del cuadro')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Ver cómo queda')).not.toBeInTheDocument();
    });

    it('con contenido muestra la leyenda y el botón de ver, sin texto', () => {
        montar(CONFIG);
        expect(screen.getByText('Configuración del cuadro')).toBeInTheDocument();
        const ver = screen.getByLabelText('Ver cómo queda');
        expect(ver.textContent).toBe('');
    });

    it('ver cómo queda esconde la leyenda y el selector de modo', () => {
        montar(CONFIG);
        fireEvent.click(screen.getByLabelText('Ver cómo queda'));
        expect(screen.queryByText('Configuración del cuadro')).not.toBeInTheDocument();
        expect(screen.queryByText('Lienzo')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Mover Lista')).not.toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Volver a editar'));
        expect(screen.getByText('Configuración del cuadro')).toBeInTheDocument();
    });

    it('el botón de plantillas ya no vive en el encabezado', () => {
        montar(CONFIG);
        expect(screen.queryByText('Plantillas')).not.toBeInTheDocument();
    });
});

describe('TarjetitaEditor · deshacer y vaciar', () => {
    it('deshacer, rehacer y vaciar viven en el encabezado', () => {
        montar(CONFIG);
        expect(screen.getByLabelText('Deshacer')).toBeInTheDocument();
        expect(screen.getByLabelText('Rehacer')).toBeInTheDocument();
        expect(screen.getByLabelText('Vaciar la tarjetita')).toBeInTheDocument();
    });

    it('con la tarjetita vacía no se puede vaciar', () => {
        montar(null);
        expect(screen.queryByLabelText('Vaciar la tarjetita')).not.toBeInTheDocument();
    });

    it('vaciar pide confirmación y deja la tarjetita en nada', async () => {
        const { onChange } = montar(CONFIG);
        fireEvent.click(screen.getByLabelText('Vaciar la tarjetita'));
        await waitFor(() => expect(screen.getByText('Sí, vaciar')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Sí, vaciar'));
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
    });

    it('en vista limpia no se ofrecen', () => {
        montar(CONFIG);
        fireEvent.click(screen.getByLabelText('Ver cómo queda'));
        expect(screen.queryByLabelText('Deshacer')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Vaciar la tarjetita')).not.toBeInTheDocument();
    });
});
