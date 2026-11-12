const RAMP_STYLE = { display: 'inline-flex', borderRadius: 4, overflow: 'hidden', verticalAlign: 'middle' };

export default function ColorRamp({ colors = [], size = 14, stretch = false }) {
    return (
        <span style={{ ...RAMP_STYLE, width: stretch ? '100%' : 'auto' }} aria-hidden="true">
            {colors.map((color, index) => (
                <i
                    key={`${color}-${index}`}
                    style={{ display: 'block', background: color, height: size, width: size, flex: stretch ? 1 : 'none' }}
                />
            ))}
        </span>
    );
}
