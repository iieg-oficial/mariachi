from sqlalchemy.orm import Session

from app.models.layer import Workspace


def canonical_layer_key(db: Session, layer_key: str) -> str:
    alias, sep, resto = layer_key.partition(':')
    if not sep:
        return layer_key
    ws = db.query(Workspace).filter(Workspace.alias == alias).first()
    if ws and ws.geoserver_workspace != alias:
        return f'{ws.geoserver_workspace}:{resto}'
    return layer_key
