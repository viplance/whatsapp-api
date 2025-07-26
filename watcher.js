const childProcess = require('child_process');
const chokidar = require('chokidar');
const { WebSocketServer } = require('ws');
const port = 8085;

const ws = new WebSocketServer({ port });
console.log('Watching server has been started at port ', port);

const pongHandler = (data) => {
  console.log('Pong has been received.', data);
  this.isAlive = true;
};

ws.on('connection', (connection) => {
  connection.isAlive = true;
  connection.on('error', console.error);
  connection.on('pong', pongHandler);
});

chokidar.watch('./public').on('all', (event, path) => {
  ws.clients.forEach((client) => {
    client.send('UPDATED');
  });
});

const url = `${process.cwd()}/index.html`;
console.log('Project folder', url);
const start =
  process.platform == 'darwin'
    ? 'open'
    : process.platform == 'win32'
      ? 'start'
      : 'xdg-open';
childProcess.exec(`${start} ${url}`);
