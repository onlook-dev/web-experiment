import { WindowMessenger, connect } from 'penpal';

const getElementAtPoint = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    const oid = element?.getAttribute('data-oid');
    return {
        oid
    }
}

const createMessageConnection = async () => {
    console.log("Iframe creating message connection");

    const messenger = new WindowMessenger({
        remoteWindow: window.parent,
        allowedOrigins: ['http://localhost:8080'],
    });

    const connection = connect({
        messenger,
        // Methods the iframe window is exposing to the parent window.
        methods: {
            getElementAtPoint,
            updateElementStyle(oid: string, style: string) {
                const element = document.querySelector(`[data-oid="${oid}"]`);
                if (element) {
                    (element as HTMLElement).style.cssText = style;
                }
            }
        },
    });

    const remote = await connection.promise as any;
}

createMessageConnection();