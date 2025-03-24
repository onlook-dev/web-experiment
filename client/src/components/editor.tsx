'use client';

import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { useEffect, useState } from 'react';
import { yCollab } from 'y-codemirror.next';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

export function Editor() {
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [yDoc, setYDoc] = useState<Y.Doc | null>(null);

    useEffect(() => {
        // // Create doc that will sync with server's doc
        const doc = new Y.Doc();
        const websocketProvider = new WebsocketProvider(
            'ws://localhost:1234',
            'test',
            doc
        );
        const yText = doc.getText('codemirror');

        // // Log connection status
        websocketProvider.on('status', event => {
            console.log('Connection status:', event.status);
        });

        // // Log when sync is complete
        websocketProvider.on('sync', (isSynced: boolean) => {
            console.log('Synced with server:', isSynced);
        });

        setYDoc(doc);
        setProvider(websocketProvider);

        yText.observe(event => {
            console.log('Document changed:', event.changes.delta);
            console.log('Current content:', yText.toString());
        });

        return () => {
            websocketProvider.destroy();
            doc.destroy();
        };
    }, []);

    if (!yDoc || !provider) {
        return <div>Loading...</div>;
    }

    return <CodeMirror
        height="100vh"
        width="100vw"
        theme="dark"
        extensions={[
            javascript({ jsx: true, typescript: true }),
            yCollab(yDoc.getText('codemirror'), provider.awareness)
        ]}
    />;
}