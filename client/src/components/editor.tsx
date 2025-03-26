'use client';

import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import { yCollab } from 'y-codemirror.next';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

export function Editor({ codeText, provider }: { codeText: Y.Text, provider: WebsocketProvider }) {
    return (
        <CodeMirror
            height="100%"
            width="100%"
            theme="dark"
            extensions={[
                javascript({ jsx: true, typescript: true }),
                yCollab(codeText, provider.awareness)
            ]}
        />
    );
}