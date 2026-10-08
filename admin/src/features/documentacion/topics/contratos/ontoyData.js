export const CAMPOS = [
    { campo: 'service', tipo: 'string', obligatorio: 'sí', descripcion: 'Identificador del servicio. El monitor lo ignora' },
    { campo: 'version', tipo: 'string', obligatorio: 'sí', descripcion: 'Versión del repo, no la del release' },
    { campo: 'released_at', tipo: 'date', obligatorio: 'no', descripcion: 'Primera entrada del CHANGELOG' },
    { campo: 'deployed_at', tipo: 'datetime ISO', obligatorio: 'no', descripcion: 'Cuándo se desplegó este artefacto' },
    { campo: 'status', tipo: 'ok | degraded | down', obligatorio: 'sí', descripcion: 'El peor de los checks críticos' },
    { campo: 'checks', tipo: 'objeto', obligatorio: 'no', descripcion: 'Cada uno con su status y su detail' },
    { campo: 'containers', tipo: 'array', obligatorio: 'no', descripcion: 'Contenedores del proyecto en ese host' },
    { campo: 'node', tipo: 'string', obligatorio: 'no', descripcion: 'Nodo del servicio: S1, S5, pmx-vine-frames' },
    { campo: 'node_reporter', tipo: 'bool', obligatorio: 'no', descripcion: 'Si es el que habla por la máquina' },
    { campo: 'host', tipo: 'objeto', obligatorio: 'no', descripcion: 'Métricas de la máquina; solo el reportero' },
    { campo: 'peers', tipo: 'objeto', obligatorio: 'no', descripcion: 'Un vecino alcanzable por entrada, con su latencia' },
];

export const ESTADOS = [
    { estado: 'ok', http: '200', afecta: 'El servicio y sus dependencias responden' },
    { estado: 'degraded', http: '200', afecta: 'Funciona pero algo está mal. Alerta igual, en amarillo' },
    { estado: 'down', http: '503', afecta: 'No puede cumplir su función' },
];

export const ESTADO_COLORS = { ok: 'success', degraded: 'warning', down: 'error' };

export const NODO_VARS = [
    { variable: 'ONTOY_NODE', obligatoria: 'sí', para: 'A qué nodo pertenece el servicio' },
    { variable: 'ONTOY_NODE_REPORTER', obligatoria: 'sí', para: 'true en uno solo por nodo: el que habla del host' },
    { variable: 'ONTOY_PEER_CHECKS', obligatoria: 'no', para: 'nodo=host:puerto. Una arista por vecino' },
    { variable: 'ONTOY_NODE_IP', obligatoria: 'no', para: 'La IP del nodo. No se mide: vive en el .env' },
    { variable: 'ONTOY_PEER_TIMEOUT', obligatoria: 'no', para: 'Segundos por arista, 0.8 por omisión' },
];

export const FORMAS = [
    {
        forma: '1. Sidecar',
        como: 'Se copia version-api/ontoy_server.py y se configura por variables de entorno',
        quien: 'huachicol, gateway-hub, acervo, sextante, dataengine',
    },
    {
        forma: '2. Backend con sidecar delante',
        como: 'El sidecar lee el /ontoy de la app con ONTOY_UPSTREAM_URL y fusiona sus checks con los suyos, sin pisarlos',
        quien: 'mariachi, mapalab, vine',
    },
    {
        forma: '3. Stack aparte',
        como: 'compose.ontoy.yaml de huachicol levanta el sidecar en el host vigilado, sin tocar su repositorio',
        quien: 'sitio2026, frames, mariachi',
    },
];

export const ADOPCION = [
    { servicio: 'huachicol', nodo: 'S1', como: 'sidecar · reportero de S1', checks: 'disk, containers, host' },
    { servicio: 'gateway-hub', nodo: 'S1', como: 'sidecar', checks: 'disk, containers, 5 puertos' },
    { servicio: 'acervo', nodo: 'S1', como: 'sidecar', checks: 'disk, containers' },
    { servicio: 'mariachi', nodo: 'S1', como: 'stack aparte + fusión', checks: 'disk, containers, db, redis, abuso, mapalab_notify' },
    { servicio: 'sieej', nodo: 'S1', como: 'ontoy.json estático vía gateway', checks: '— (status fijo ok)' },
    { servicio: 'mapalab', nodo: 'S2', como: 'sidecar + fusión', checks: 'disk, containers, db, client_errors, embeds' },
    { servicio: 'sextante', nodo: 'S3', como: 'sidecar', checks: 'disk, containers' },
    { servicio: 'dataengine', nodo: 'S4', como: 'sidecar en jobs/, sin socket', checks: 'disk' },
    { servicio: 'sitio2026', nodo: 'S5', como: 'stack aparte', checks: 'disk, containers' },
    { servicio: 'frames', nodo: 'pmx-vine-frames', como: 'stack aparte, puerto 8088', checks: 'disk, containers, frigate' },
    { servicio: 'vine', nodo: 'pmx-vine-frames', como: 'sidecar + fusión, puerto 8089', checks: 'disk, containers, db, zkteco_sync, checkins_today' },
];

export const EJEMPLO_RESPUESTA = `{
  "service": "huachicol",
  "version": "2.16.0",
  "released_at": "2026-08-28",
  "deployed_at": "2026-08-28T21:21:47Z",
  "status": "ok",
  "node": "S1",
  "node_reporter": true,
  "host": {
    "cores": 8, "cpu_used_percent": 12, "load_1m": 0.42,
    "memory_used_percent": 61, "uptime_seconds": 1483920, "os": "Ubuntu 24.04.1 LTS"
  },
  "peers": { "S4": { "status": "ok", "latency_ms": 2 } },
  "checks": {
    "disk":       { "status": "ok", "used_percent": 51.4, "free_gb": 408.1 },
    "containers": { "status": "ok", "total": 11, "running": 11 },
    "carga":      { "status": "ok", "load_1m": 0.42, "informativo": true }
  },
  "containers": [
    { "name": "prometheus", "state": "running", "health": "healthy",
      "image": "prom/prometheus:v3.2.1", "project": "huachicol" }
  ]
}`;
