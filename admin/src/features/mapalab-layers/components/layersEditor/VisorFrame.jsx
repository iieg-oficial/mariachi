import './visorPreview.css';

export default function VisorFrame({ caption, children, note }) {
    return (
        <div className="visor-frame">
            <div className="visor-frame-cap">{caption}</div>
            <div className="visor-frame-body">{children}</div>
            {note && <div className="visor-frame-note">{note}</div>}
        </div>
    );
}
