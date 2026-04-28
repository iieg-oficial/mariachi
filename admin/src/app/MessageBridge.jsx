import { useEffect } from 'react';
import { App } from 'antd';
import { setMessageApi } from '@shared/services/message';

export default function MessageBridge() {
    const { message } = App.useApp();
    useEffect(() => {
        setMessageApi(message);
    }, [message]);
    return null;
}
