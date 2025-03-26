import { useEffect, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

interface MousePosition {
    x: number;
    y: number;
    clientId: number;
    user?: {
        name: string;
        color: string;
    };
}

export const GestureScreen = ({ remote, provider }: { remote?: any, provider: WebsocketProvider }) => {
    const [otherMousePositions, setOtherMousePositions] = useState<Map<number, MousePosition>>(new Map());
    const mouseMap = provider.doc.getMap('mouse');

    useEffect(() => {
        const observer = (event: Y.YMapEvent<any>) => {
            const positions = mouseMap.toJSON();
            const connectedClients = new Set(Array.from(provider.awareness.getStates().keys()));

            setOtherMousePositions(prev => {
                const newMap = new Map();
                Object.entries(positions).forEach(([clientId, position]: [string, any]) => {
                    // Skip our own cursor
                    if (Number(clientId) === provider.awareness.clientID) return;

                    // Only show cursors for connected clients
                    if (!connectedClients.has(Number(clientId))) return;

                    const userState = provider.awareness.getStates().get(Number(clientId));
                    newMap.set(Number(clientId), {
                        ...position,
                        clientId: Number(clientId),
                        user: userState?.user
                    });
                    if (remote) {
                        remote.mouseMove(position.x, position.y, userState?.user?.color || '#666');
                    }
                });
                return newMap;
            });
        };

        mouseMap.observe(observer);
        provider.awareness.on('change', observer);

        return () => {
            mouseMap.unobserve(observer);
            provider.awareness.off('change', observer);
        };
    }, [mouseMap, provider.awareness]);

    const handleMouseMove = async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!remote) return;
        await remote.mouseMove(e.clientX, e.clientY, provider.awareness.getStates().get(provider.awareness.clientID)?.user?.color || '#666');

        // Store position with our client ID as the key
        mouseMap.set(String(provider.awareness.clientID), {
            x: e.clientX,
            y: e.clientY
        });
    }

    return (
        <div className="w-full h-full bg-red-500/10 absolute top-0 left-0"
            onMouseMove={handleMouseMove}
        >
            {Array.from(otherMousePositions.values()).map((position) => (
                <div
                    key={position.clientId}
                    className="absolute pointer-events-none"
                    style={{
                        left: position.x,
                        top: position.y,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    {/* Cursor */}
                    <div
                        className="w-4 h-4 rounded-full"
                        style={{
                            backgroundColor: position.user?.color || '#666'
                        }}
                    />
                    {/* Username label */}
                    <div
                        className="text-sm px-2 py-1 rounded-md mt-1 whitespace-nowrap"
                        style={{
                            backgroundColor: position.user?.color || '#666',
                            color: '#fff'
                        }}
                    >
                        {position.user?.name || 'Anonymous'}
                    </div>
                </div>
            ))}
        </div>
    )
};
