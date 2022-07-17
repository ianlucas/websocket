import { room } from "./websocket_client.js";

function push_message(chatbox, data) {
    const element = document.createElement("div");
    element.textContent = data.message;
    if (data.type === "server") {
        element.style.color = "purple";
    }
    chatbox.appendChild(element);
}

function render(state) {
    const chatbox = document.getElementById("chatbox");
    while (chatbox.firstChild) {
        chatbox.removeChild(chatbox.firstChild);
    }
    state.messages.forEach(function (data) {
        push_message(chatbox, data);
    });
}

const chat = room(
    "chat",
    "my-chat"
);

chat.on_state_change(function (state) {
    render(state);
});

/** @type {HTMLFormElement} */
const form = document.getElementById("form");

form.addEventListener("submit", function (event) {
    event.preventDefault();
    const message = form.elements.message.value;
    if (!message.length) {
        return;
    }
    form.elements.message.value = "";
    chat.send("message", message);
});