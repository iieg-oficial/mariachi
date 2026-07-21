import { Suspense, lazy, useEffect, useState } from 'react';
import { Spin, Tabs } from 'antd';
import { getApps } from '@features/mapalab-stats/api/mapalabStatsService';

const MapalabStatsPage = lazy(() =>
    import('@features/mapalab-stats').then((m) => ({ default: m.MapalabStatsPage })));

const fallback = <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;

const DEFAULT_APPS = [{ key: 'mapalab', label: 'MapaLab' }];

export default function UsoSection() {
    const [apps, setApps] = useState(null);

    useEffect(() => {
        let cancelled = false;
        getApps()
            .then((data) => { if (!cancelled) setApps(data?.length ? data : DEFAULT_APPS); })
            .catch(() => { if (!cancelled) setApps(DEFAULT_APPS); });
        return () => { cancelled = true; };
    }, []);

    if (!apps) return fallback;

    const items = apps.map((a) => ({
        key: a.key,
        label: a.label,
        children: <Suspense fallback={fallback}><MapalabStatsPage app={a.key} /></Suspense>,
    }));

    return <Tabs items={items} destroyInactiveTabPane tabBarStyle={{ paddingInline: 24 }} />;
}
