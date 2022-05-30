var clients = {}
var games = {}
const http = require('http').createServer().listen(8080, console.log('listening on port 8080'))
const server = require('websocket').server
const socket = new server({ 'httpServer': http })
socket.on('request', (req) => {
    const conn = req.accept(null, req.origin)
    const clientId = Math.round(Math.random() * 10 + Math.random() * 10 + Math.random() * 10)
    clients[clientId] = { 'conn': conn }
    conn.send(JSON.stringify({
        'tag': 'connected',
        'clientId': clientId
    }))

    sendAvailGame()
})

function sendAvailGame() {
    games = [1, 3, 4]
    for (const client in clients)
        clients[client].conn.send(JSON.stringify({
            'tag': 'gamesList',
            'list': games
        }))
}

function onMessage(msg) {
    const data = JSON.parse(msg.utf8Data)
    switch (data.tag) {
        case 'create':
            const gameId = Math.round(Math.random() * 100) + Math.round(Math.random() * 100) + Math.round(Math.random() * 100)
            const board =['', ]
    }
}