import { WebsocketProvider } from "y-websocket";

export const GestureScreen = ({ remote, provider }: { remote?: any, provider: WebsocketProvider }) => {
    const handleMouseMove = async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!remote) return;
        await remote.mouseMove(e.clientX, e.clientY);
        provider.awareness.setLocalStateField('user', {
            name: `User ${Math.floor(Math.random() * 1000)}`, // Random user name
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random color
        });
    }

    return (
        <div className="w-full h-full bg-red-500/10 absolute top-0 left-0"
            onMouseMove={handleMouseMove}
        ></div>
    )
};
