import { useEffect, useState } from 'react';

const MIN_HEIGHT = 240;

export default function useFillHeight(bottom) {
    const [node, setNode] = useState(null);
    const [height, setHeight] = useState(MIN_HEIGHT);

    useEffect(() => {
        if (!node) return undefined;
        const update = () => {
            const top = node.getBoundingClientRect().top + window.scrollY;
            setHeight(Math.max(MIN_HEIGHT, Math.floor(window.innerHeight - top - bottom)));
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [node, bottom]);

    return [setNode, height];
}
