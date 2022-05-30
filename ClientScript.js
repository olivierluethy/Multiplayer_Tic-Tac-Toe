// const { client } = require("websocket");

var clientId
const create = document.getElementById("createGame")
create.disabled = true
const join = document.getElementById("joinGame")
join.disabled = true
const list = document.querySelector('ul')

const connect = document.getElementById("connect");
connect.addEventListener('click', (src) => {
    var socket = new WebSocket('ws://localhost:8080')
    socket.onmessage = onMessage
    src.target.disabled = true;
})

function onMessage(msg) {
    const data = JSON.parse(msg.data)
    switch (data.tag) {
        case 'connected':
            clientId = data.clientId
            console.log(data.clientId)
            const lblClientId = document.getElementById("client_id")
            lblClientId.innerHTML = data.clientId
            lblClientId.style.color = "white"
            create.disabled = false
            join.disabled = false
            break
        case 'gamesList':
            const games = data.list
            while (list.firstChild) {
                list.removeChild(list.lastChild)
            }
            games.forEach(game => {
                const li = document.createElement('li')
                li.innerText = game
                li.style.color = "white"
                list.appendChild(li)
            })
    }
}

create.addEventListener('click', () => {
    socket.send(JSON.stringify({
        'tag': 'create',
        'clientId': clientId
    }))
})