import { Suspense, lazy } from 'react';
import { Spin } from 'antd';

const MapalabStatsPage = lazy(() =>
    import('@features/mapalab-stats').then((m) => ({ default: m.MapalabStatsPage })));

const fallback = <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;

export default function UsoSection() {
    return <Suspense fallback={fallback}><MapalabStatsPage app="mapalab" /></Suspense>;
}
