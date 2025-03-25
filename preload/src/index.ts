import { WindowMessenger, connect } from 'penpal';

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
            mouseMove(x: number, y: number) {
                const element = document.elementFromPoint(x, y);
                if (!element) return;
                // Remove border for all elements
                document.querySelectorAll('*').forEach(el => {
                    (el as HTMLElement).style.cssText = '';
                });
                // Add red border to the element
                (element as HTMLElement).style.cssText = 'background-color: red;';
            }
        },
    });

    const remote = await connection.promise as any;
}

createMessageConnection();