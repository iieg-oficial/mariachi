import { Image } from 'antd';

import { urlArchivo } from '../api/intranetService';

const Miniatura = ({ ruta, alt }) => {
    const url = urlArchivo(ruta);
    if (!url) return null;
    return <Image src={url} alt={alt} width={64} height={40} style={{ objectFit: 'cover' }} />;
};

export default Miniatura;
