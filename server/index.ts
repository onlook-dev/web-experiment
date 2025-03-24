import { IncomingMessage } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { yjsServer } from './YjsServer';

// Main server code
const PORT = Number(process.env['PORT'] || 1234);
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // This handler will normalize messages before passing to the Yjs handler
    ws.on('message', (message: WebSocket.Data) => {
        if (message instanceof Uint8Array) {
            console.log('Received Uint8Array message');
        } else if (message instanceof ArrayBuffer) {
            console.log('Received ArrayBuffer message');
        } else if (Buffer.isBuffer(message)) {
            console.log('Received Buffer message');
        } else {
            console.log('Received message type:', typeof message);
        }
    });

    console.log('Connection established', req.url);
    yjsServer.handleConnection(ws, req);
});

console.log(`Yjs Server running on port ${PORT}`);

// Handle shutdown
process.on('SIGINT', () => {
    yjsServer.close();
    process.exit(0);
});