import { client } from "./websocket_client.js";

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

const chat = client(
    "ws://localhost:1333"
).room(
    "chat",
    "my-chat"
);

chat.on_state_change(function (state) {
    console.log(
        JSON.parse(
            JSON.stringify(state)
        )
    );
    render(state);
});

/** @type {HTMLFormElement} */
const message_form = document.getElementById("message_form");
const quiz_form = document.getElementById("quiz_form");

message_form.addEventListener("submit", function (event) {
    event.preventDefault();
    const message = message_form.elements.message.value;
    if (!message.length) {
        return;
    }
    message_form.elements.message.value = "";
    chat.send("message", message);
});

quiz_form.addEventListener("submit", function (event) {
    event.preventDefault();
    const quiz = quiz_form.elements.quiz.value;
    if (!quiz.length) {
        return;
    }
    chat.send("quiz", quiz);
})