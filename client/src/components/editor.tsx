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
    let text: Y.Text;

    useEffect(() => {
        // // Create doc that will sync with server's doc
        const doc = new Y.Doc();
        const websocketProvider = new WebsocketProvider(
            'ws://localhost:1234',
            'test',
            doc,
        );

        setYDoc(doc);
        setProvider(websocketProvider);

        return () => {
            websocketProvider.destroy();
            doc.destroy();
        };
    }, []);

    if (!yDoc || !provider) {
        return <div>Loading...</div>;
    }

    text = yDoc.getText('codemirror');

    return (
        <CodeMirror
            height="100%"
            width="100%"
            theme="dark"
            extensions={[
                javascript({ jsx: true, typescript: true }),
                yCollab(text, provider.awareness)
            ]}
        />
    );
}