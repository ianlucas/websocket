import { IncomingHttpHeaders, IncomingMessage } from "http";
import { nanoid } from "nanoid";
import WebSocket, { WebSocketServer } from "ws";

interface AuthenticateRequest {
    headers: IncomingHttpHeaders;
}

interface RoomSpec {
    messages: Record<string, (room: ExtendedRoom) => void>;
    on_create: (room: Room) => Promise<void>;
    on_join: (room: ExtendedRoom) => Promise<void>;
    on_leave: (room: ExtendedRoom) => Promise<void>;
}

interface ServerSpec {
    authenticate?: (request?: AuthenticateRequest) => Promise<string|undefined>;
    port: number;
    rooms: Record<string, RoomSpec>;
}

interface ClientData {
    client_id: string;
    room_id: string;
    room_key: string;
    room_type: string;
    user_id?: string;
}

interface Room {
    clear_timer: (name: string) => void;
    clients: WebSocket.WebSocket[];
    local: any;
    room_id: string;
    set_state: (patch: any) => void;
    set_timer: (name: string, callback: () => void, ms: number) => void;
    state: any;
}

interface ExtendedRoom extends Room {
    client_id: string;
    user_id?: string;
    value?: any;
}

interface MessageData {
    type: string;
    value: any;
}

export function server(spec: ServerSpec) {
    const room_map: Record<string, Room> = {};
    const wss = new WebSocketServer({
        port: spec.port
    });

    async function authenticate(websocket: WebSocket.WebSocket, request: IncomingMessage): Promise<ClientData> {
        if (!request.url) {
            throw "Invalid request URL.";
        }
        const path = request.url.substring(1).split("/");
        const [room_type, room_id] = path;
        const room_key = room_type + room_id;
        if ((room_type in spec.rooms) === false) {
            throw (
                "Invalid room type provided by websocket. "
                + "(room_type="
                + room_type
                + ")"
            );
        }
        const client_id = nanoid();
        if (!spec.authenticate) {
            spec.authenticate = async function stub_authenticate() {
                return undefined;
            }
        }
        const user_id = await spec.authenticate({
            headers: request.headers
        });
        return {
            client_id,
            room_id,
            room_key,
            room_type,
            user_id
        };
    }

    function room_constructor(room_id: string): Room {
        const state: any = {};
        const local: any = {};
        const clients: WebSocket.WebSocket[] = [];
        const timers: Record<string, any> = {};

        function set_state(patch: any) {
            Object.assign(state, patch);
            clients.forEach(function (client) {
                client.send(
                    JSON.stringify({
                        type: "state",
                        value: state
                    })
                );
            });
        }

        function set_timer(name: string, callback: () => void, ms: number) {
            timers[name] = setTimeout(callback, ms);
        }

        function clear_timer(name: string) {
            clearTimeout(timers[name]);
        }

        return {
            clear_timer,
            clients,
            local,
            room_id,
            set_state,
            set_timer,
            state
        };
    }

    async function join_room(websocket: WebSocket.WebSocket, client_data: ClientData) {
        const { client_id, room_type, room_key, user_id } = client_data;
        const room_spec = spec.rooms[room_type];
        const room = room_map[room_key];

        await room_spec.on_join({
            ...room,
            client_id,
            user_id
        });

        room.clients.push(websocket);

        websocket.send(
            JSON.stringify({
                type: "state",
                value: room.state
            })
        );

        function handle_message(raw: string) {
            try {
                const data = JSON.parse(raw) as MessageData;
                room_spec.messages[data.type]({
                    ...room,
                    client_id,
                    user_id,
                    value: data.value
                });
            } catch (ignore) {}
        }

        function handle_close() {
            const client_index = room.clients.findIndex(function (value) {
                return value === websocket;
            });
            room.clients.splice(client_index, 1);
            room_spec.on_leave({
                ...room,
                client_id,
                user_id
            });
        }

        websocket.on("message", handle_message);
        websocket.on("close", handle_close);
    }

    async function create_room(websocket: WebSocket.WebSocket, client_data: ClientData) {
        const { room_type, room_id, room_key } = client_data;
        try {
            const room_spec = spec.rooms[room_type];
            const room = room_map[room_key] = room_constructor(room_id);
            await room_spec.on_create(room);
            await join_room(websocket, client_data);
        } catch (error) {
            delete room_map[room_key];
            throw error;
        }
    }

    async function handle_connection(websocket: WebSocket.WebSocket, request: IncomingMessage) {
        try {
            const client_data = await authenticate(websocket, request);
            if (!room_map[client_data.room_key]) {
                await create_room(websocket, client_data);
            } else {
                await join_room(websocket, client_data);
            }
        } catch (error) {
            websocket.terminate();
            console.log(
                "[websocket] Terminated a websocket caused by "
                + String(error)
            );
        }
    }

    wss.on("connection", handle_connection);
}