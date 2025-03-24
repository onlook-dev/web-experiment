import { runWebSocketServer } from './yjs/ws';
import { yjsServer } from './yjs/yjs';

runWebSocketServer();

process.on('SIGINT', () => {
    yjsServer.close();
    process.exit(0);
});