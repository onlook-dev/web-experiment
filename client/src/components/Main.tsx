"use client"

import { useEffect, useState } from "react";
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { Editor } from "./Editor";
import { Frame } from "./Frame";

export const Main = () => {
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
    const userName = `User ${Math.floor(Math.random() * 1000)}`;
    const userColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

    useEffect(() => {
        // // Create doc that will sync with server's doc
        const doc = new Y.Doc();
        const websocketProvider = new WebsocketProvider(
            'ws://localhost:1234/?document=doc',
            'room',
            doc,
        );

        // Set user metadata
        websocketProvider.awareness.setLocalStateField('user', {
            name: userName,
            color: userColor,
        });

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

    const codeText = yDoc.getText('code');

    if (!codeText) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex flex-row items-center justify-center h-screen">
            <div className="w-1/2 h-full">
                <Frame provider={provider} />
            </div>
            <div className="w-1/2 h-full">
                <Editor codeText={codeText} provider={provider} />
            </div>
        </div>
    )
}