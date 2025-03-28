"use client";

import { useState } from "react";

import { WindowMessenger, connect } from 'penpal';
import { useRef } from "react";
import { WebsocketProvider } from "y-websocket";
import { GestureScreen } from './GestureScreen';

export const Frame = ({ provider }: {
    provider: WebsocketProvider
}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [remote, setRemote] = useState<any>(null);

    const handleIframeLoad = async () => {
        console.log("Parent loading messages");
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;

        const messenger = new WindowMessenger({
            remoteWindow: iframe.contentWindow,
            allowedOrigins: ['http://localhost:3000'],
        });
        const connection = connect({
            messenger,
            // Methods the iframe window is exposing to the parent window.
            methods: {}
        });
        const remote = await connection.promise as any;
        setRemote(remote);
    }

    return (
        <div className="w-96 h-96 m-auto relative">
            <iframe
                ref={iframeRef}
                src="http://localhost:3000"
                sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
                allow="geolocation; microphone; camera; midi; encrypted-media"
                className="w-full h-full"
                onLoad={handleIframeLoad}
            />
            <GestureScreen remote={remote} provider={provider} />
        </div>
    );
};