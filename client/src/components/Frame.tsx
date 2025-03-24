"use client";

import { forwardRef, useRef } from "react";

export type IFrameView = HTMLIFrameElement & {
    executeJavaScript: (code: string) => Promise<any>;
};

export const Frame = forwardRef<IFrameView>((props, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    return (
        <iframe
            ref={iframeRef}
            src="http://localhost:1235"
            sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads allow-presentation"
            allow="geolocation; microphone; camera; midi; encrypted-media"
            className="w-full h-full"
            {...props}
        />
    );
});