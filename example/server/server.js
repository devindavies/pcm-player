import WebSocket, { WebSocketServer } from 'ws';
import fs from 'node:fs';

const pcm_file = './16bit-8000.raw';
let interval = 0;
const sampleRate = 8000;
const bytePerSample = 2;
const channels = 2;
const bytesChunk = (sampleRate * bytePerSample * channels);
let offset = 0;
let pcmData;
let wss;

fs.readFile(pcm_file, (err, data) => {
  if (err) throw err;
  pcmData = data;
  openSocket();
});


function openSocket() {
  wss = new WebSocketServer({ port: 8080 });
  console.log('Server ready...');
  wss.on('connection', function connection(ws) {
    console.log('Socket connected. sending data...');
    if (interval) {
      clearInterval(interval);
    }
    interval = setInterval(() => {
      sendData();
    }, 500);
  });
}

function sendData() {

  if (offset >= pcmData.length) {
    clearInterval(interval);
    offset = 0;
    return;
  }

  const payload = pcmData.subarray(offset, (offset + bytesChunk));
  offset += bytesChunk;
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  };
}