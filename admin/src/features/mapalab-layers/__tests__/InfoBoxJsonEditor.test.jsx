import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import InfoBoxJsonEditor from '@features/mapalab-layers/components/layersEditor/InfoBoxJsonEditor';

const CONFIG = {
    headerField: 'nombre',
    list: [{ label: 'Municipio', field: 'municipio' }],
};

const setup = (props = {}) => {
    const onChange = vi.fn();
    render(<InfoBoxJsonEditor value={CONFIG} onChange={onChange} {...props} />);
    return { onChange, textarea: screen.getByRole('textbox') };
};

describe('InfoBoxJsonEditor', () => {
    it('muestra la configuracion actual formateada', () => {
        const { textarea } = setup();
        expect(textarea.value).toBe(JSON.stringify(CONFIG, null, 2));
    });

    it('emite el objeto parseado cuando el JSON es valido', () => {
        const { onChange, textarea } = setup();
        fireEvent.change(textarea, { target: { value: '{"headerField":"clave"}' } });
        expect(onChange).toHaveBeenCalledWith({ headerField: 'clave' });
    });

    it('no emite nada mientras el JSON este roto', () => {
        const { onChange, textarea } = setup();
        fireEvent.change(textarea, { target: { value: '{"headerField":' } });
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByText(/JSON inválido/)).toBeInTheDocument();
    });

    it('rechaza un JSON que no sea objeto', () => {
        const { onChange, textarea } = setup();
        fireEvent.change(textarea, { target: { value: '[1, 2]' } });
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByText(/tiene que ser un objeto/)).toBeInTheDocument();
    });

    it('vaciar el campo quita la tarjeta propia', () => {
        const { onChange, textarea } = setup();
        fireEvent.change(textarea, { target: { value: '   ' } });
        expect(onChange).toHaveBeenCalledWith(null);
    });

    it('avisa de las claves que el visor no lee', () => {
        setup({ value: { ...CONFIG, cardsColumnas: 2 } });
        expect(screen.getByText(/Claves que el visor no lee: cardsColumnas/)).toBeInTheDocument();
    });

    it('parte del JSON heredado cuando la capa no tiene tarjeta propia', () => {
        const onChange = vi.fn();
        render(
            <InfoBoxJsonEditor
                value={null}
                onChange={onChange}
                inherited={{ label: 'Salud', config: CONFIG }}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: /Partir del JSON heredado/ }));
        expect(onChange).toHaveBeenCalledWith(CONFIG);
    });
});
