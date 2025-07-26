// watch files changes to reload UI
const watcherSocketUrl = 'ws://localhost:8085';
let watcherSocket;

function connectToWatcherSocket() {
  watcherSocket = new WebSocket(watcherSocketUrl, 'json');

  watcherSocket.onclose = (event) => {
    setTimeout(connectToWatcherSocket, 5000);
  };

  watcherSocket.onmessage = (event) => {
    if (event.data === 'UPDATED') location.reload();
  };
}

window.addEventListener('load', () => {
  if (window.location.hostname === 'localhost') {
    connectToWatcherSocket();
  }
});
