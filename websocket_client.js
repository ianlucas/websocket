function event_emitter() {
    var callbacks = {};
    return {
        on: function (type, handler) {
            if (!callbacks[type]) {
                callbacks[type] = [];
            }
            callbacks[type].push(handler);
        },
        emit: function (type) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (callbacks[type]) {
                callbacks[type].forEach(function (handler) {
                    handler.apply(void 0, args);
                });
            }
        }
    };
}
function room(url, room_type, room_id) {
    var emitter = event_emitter();
    var ws = new WebSocket(url
        + "/"
        + room_type
        + "/"
        + room_id);
    function handle_message(event) {
        var data = JSON.parse(event.data);
        switch (data.type) {
            case "state":
                emitter.emit("state", data.value);
                break;
            default:
                throw new Error("Invalid message type sent by server.");
        }
    }
    function handle_close(event) {
        emitter.emit("close", event.reason);
    }
    ws.addEventListener("close", handle_close);
    ws.addEventListener("message", handle_message);
    return {
        on_state_change: function (callback) {
            emitter.on("state", callback);
        },
        send: function (type, value) {
            ws.send(JSON.stringify({
                type: type,
                value: value
            }));
        }
    };
}
export function client(url) {
    return {
        room: function (room_type, room_id) {
            return room(url, room_type, room_id);
        }
    };
}
