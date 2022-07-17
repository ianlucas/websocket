function event_emitter() {
    const callbacks = {};
    return {
        on(type: string, handler: Function) {
            if (!callbacks[type]) {
                callbacks[type] = [];
            }
            callbacks[type].push(handler);
        },

        emit(type: string, ...args: any[]) {
            if (callbacks[type]) {
                callbacks[type].forEach(function (handler: Function) {
                    handler(...args);
                });
            }
        }
    }
}

function room(url: string, room_type: string, room_id: string) {
    const emitter = event_emitter();
    const ws = new WebSocket(
        url
        + "/"
        + room_type
        + "/"
        + room_id
    );

    function handle_message(event: MessageEvent) {
        const data = JSON.parse(
            event.data
        );
        switch (data.type) {
        case "state":
            emitter.emit(
                "state",
                data.value
            );
            break;
        default:
            throw new Error(
                "Invalid message type sent by server."
            );
        }
    }

    function handle_close(event: CloseEvent) {
        emitter.emit("close", event.reason);
    }

    ws.addEventListener("close", handle_close);
    ws.addEventListener("message", handle_message);

    return {
        on_state_change(callback: (state: any) => void) {
            emitter.on("state", callback);
        },

        send(type: string, value: any) {
            ws.send(
                JSON.stringify({
                    type,
                    value
                })
            );
        }
    }
}

export function client(url: string) {
    return {
        room(
            room_type: string,
            room_id: string
        ) {
            return room(url, room_type, room_id);
        }
    }
}