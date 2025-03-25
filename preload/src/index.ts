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
            multiply(num1: number, num2: number) {
                return num1 * num2;
            },
            divide(num1: number, num2: number) {
                // Return a promise if asynchronous processing is needed.
                return num1 / num2;
            },
        },
    });

    const remote = await connection.promise as any;
    console.log("remote", remote);
    // Calling a remote method will always return a promise.
    const additionResult = await remote.add(2, 6);
    console.log(additionResult); // 8
}

createMessageConnection();