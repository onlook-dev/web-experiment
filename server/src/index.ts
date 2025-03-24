import { runContentServer } from './content';
import { runWebSocketServer } from './yjs/ws';
import { yjsServer } from './yjs/yjs';

runContentServer();
runWebSocketServer();

process.on('SIGINT', () => {
    yjsServer.close();
    process.exit(0);
});