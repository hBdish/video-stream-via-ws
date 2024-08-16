const WebSocketServer = new require('ws');


// подключённые клиенты
const clients = {};

// WebSocket-сервер на порту 8081
const webSocketServer = new WebSocketServer.Server({
  port: 8081
});

// console.log(blob)

webSocketServer.on('connection', function(ws) {

  const id = Math.random();
  clients[id] = ws;
  console.log("новое соединение " + id);

  ws.on('message', async function(message) {
    console.log('получено сообщение ', message);

    ws.binaryType = "arraybuffer";

    for (let key in clients) {
      clients[key].send(message);
    }
  });

  ws.on('close', function() {
    console.log('соединение закрыто ' + id);
    delete clients[id];
  });

  ws.on('open', async function(request) {

    ws.send(JSON.stringify(123));
  });

});
