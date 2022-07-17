import { server } from "./websocket";
import { nanoid } from "nanoid";

server({
    port: 1333,
    async authenticate() {
        return nanoid();
    },
    rooms: {
        chat: {
            async on_create({ room_id, set_state }) {
                if (room_id !== "my-chat") {
                    throw "Invalid Room ID!";
                }
                return set_state({
                    messages: []
                });
            },

            async on_join({ state, set_state, user_id, client_id }) {
                set_state({
                    messages: state.messages.concat({
                        type: "server",
                        message: (
                            user_id
                            + " has joined the chat (id: "
                            + client_id
                            + ")."
                        )
                    })
                })
            },

            async on_leave({ client_id, user_id, state, set_state }) {
                set_state({
                    messages: state.messages.concat({
                        type: "server",
                        message: (
                            user_id
                            + " has left the chat (id: "
                            + client_id
                            + ")."
                        )
                    })
                })
            },

            messages: {
                message({ state, set_state, user_id, client_id, value }) {
                    set_state({
                        messages: state.messages.concat({
                            type: "user",
                            message: (
                                user_id
                                + " (id: "
                                + client_id
                                + "): "
                                + value
                            )
                        })
                    })
                }
            }
        }
    }
});