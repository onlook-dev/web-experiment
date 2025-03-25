"use client";

import { WindowMessenger, connect } from 'penpal';
import { forwardRef, useRef } from "react";

export type IFrameView = HTMLIFrameElement & {
    executeJavaScript: (code: string) => Promise<any>;
};

export const Frame = forwardRef<IFrameView>((props, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleIframeLoad = async () => {
        console.log("Parent creating message connection");
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;

        const messenger = new WindowMessenger({
            remoteWindow: iframe.contentWindow,
            allowedOrigins: ['http://localhost:1235'],
        });
        const connection = connect({
            messenger,
            // Methods the iframe window is exposing to the parent window.
            methods: {
                add(num1: number, num2: number) {
                    return num1 + num2;
                },
            }
        });
        const remote = await connection.promise as any;

        // Calling a remote method will always return a promise.
        const multiplicationResult = await remote.multiply(2, 6);
        console.log(multiplicationResult); // 12
        const divisionResult = await remote.divide(12, 4);
        console.log(divisionResult); // 3
    }

    return (
        <iframe
            ref={iframeRef}
            src="http://localhost:1235"
            sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads allow-presentation"
            allow="geolocation; microphone; camera; midi; encrypted-media"
            className="w-full h-full"
            {...props}
            onLoad={handleIframeLoad}
        />
    );
});