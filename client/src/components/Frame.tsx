"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

export type IFrameView = HTMLIFrameElement & {
    executeJavaScript: (code: string) => Promise<any>;
};

export const Frame = forwardRef<IFrameView>((props, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleIframeLoad = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe) {
            console.error('No iframe');
            return;
        }

        try {
            // Access contentDocument through contentWindow
            const iframeDoc = iframe.contentWindow?.document;
            if (!iframeDoc) return;

            // Create and inject the script
            const script = iframeDoc.createElement('script');
            script.textContent = `
                console.log('Script injected!');
                
                // Setup message handling
                window.addEventListener('message', (event) => {
                    if (event.origin !== window.parent.origin) return;
                    console.log('Message received:', event.data);
                });
            `;
            iframeDoc.head.appendChild(script);
            console.log("Script injected");
        } catch (error) {
            console.error('Failed to access iframe document:', error);
        }
    }, []);

    useEffect(() => {
        handleIframeLoad();
    }, [handleIframeLoad]);

    useImperativeHandle(ref, () => {
        const iframe = iframeRef.current!;

        Object.assign(iframe, {
            executeJavaScript: async (code: string): Promise<any> => {
                const contentWindow = iframe.contentWindow;
                if (!contentWindow) {
                    throw new Error('No iframe content window available');
                }

                return new Promise((resolve, reject) => {
                    const channel = new MessageChannel();
                    const messageId = `execute_${Date.now()}_${Math.random()}`;

                    channel.port1.onmessage = (event) => {
                        channel.port1.close();
                        if (event.data.error) {
                            reject(new Error(event.data.error));
                        } else {
                            resolve(event.data.result);
                        }
                    };

                    const wrappedCode = `
                        (async () => {
                            try {
                                const result = await (${code});
                                window.postMessage({
                                    type: 'execute-response',
                                    messageId: '${messageId}',
                                    result
                                }, '*', [event.ports[0]]);
                            } catch (error) {
                                window.postMessage({
                                    type: 'execute-error',
                                    messageId: '${messageId}',
                                    error: error.message
                                }, '*', [event.ports[0]]);
                            }
                        })();
                    `;

                    contentWindow.postMessage(
                        {
                            type: 'execute-code',
                            code: wrappedCode,
                            messageId,
                        },
                        '*',
                        [channel.port2],
                    );
                });
            },
        });

        return iframe as IFrameView;
    }, []);

    return (
        <iframe
            ref={iframeRef}
            src="http://localhost:3000"
            sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads allow-presentation"
            allow="geolocation; microphone; camera; midi; encrypted-media"
            className="w-full h-full"
            onLoad={handleIframeLoad}
            {...props}
        />
    );
});