import { Button } from 'antd';

export default function GridIconButton({ icon, label, expanded = false, className = '', ...rest }) {
    return (
        <Button
            shape="round"
            aria-label={label}
            className={`grid-icon-btn ${expanded ? 'grid-icon-btn-expanded' : ''} ${className}`.trim()}
            {...rest}
        >
            {icon}
            <span className="grid-icon-btn-label">{label}</span>
        </Button>
    );
}
