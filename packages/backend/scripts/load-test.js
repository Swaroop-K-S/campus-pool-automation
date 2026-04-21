const { io } = require('socket.io-client');
const os = require('os');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';
const CONCURRENT_CLIENTS = 2000;
const BATCH_SIZE = 50; 
const BATCH_DELAY_MS = 200;

console.log(`Starting Load Test with ${CONCURRENT_CLIENTS} concurrent socket connections...`);
const clients = [];
let connectionsEstablished = 0;
let roomsAssigned = 0;

function printMemoryStats() {
  const mem = process.memoryUsage();
  console.log(`\n--- System Memory ---`);
  console.log(`RSS: ${Math.round(mem.rss / 1024 / 1024)} MB`);
  console.log(`Heap Total: ${Math.round(mem.heapTotal / 1024 / 1024)} MB`);
  console.log(`Heap Used: ${Math.round(mem.heapUsed / 1024 / 1024)} MB`);
  console.log(`Connections: ${connectionsEstablished} | Rooms Assigned: ${roomsAssigned} | Target: ${CONCURRENT_CLIENTS}\n`);
}

function spawnClient(id) {
  return new Promise((resolve) => {
    // Force WebSocket transport to avoid polling overhead which isn't true load for our purposes
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: false,
      query: { usn: `USN_LOAD_${id}`, role: 'student' }
    });

    socket.on('connect', () => {
      connectionsEstablished++;
      // Immediately request to join drive and listen for assignments
      socket.emit('student:join_drive', { driveId: 'drive_xyz', studentId: `ST_${id}` });
      resolve(socket);
    });

    socket.on('room:assigned', (data) => {
      roomsAssigned++;
    });

    socket.on('disconnect', () => {
      connectionsEstablished--;
    });
    
    socket.on('connect_error', (err) => {
      console.warn(`[Client ${id}] Connection error: ${err.message}`);
      resolve(socket);
    });
  });
}

async function runLoadTest() {
  setInterval(printMemoryStats, 5000);

  // Spawn in batches to prevent overwhelming OS ephemeral ports in one tick
  for (let i = 0; i < CONCURRENT_CLIENTS; i += BATCH_SIZE) {
    const batch = [];
    for (let j = 0; j < BATCH_SIZE && (i + j) < CONCURRENT_CLIENTS; j++) {
      batch.push(spawnClient(i + j));
    }
    await Promise.all(batch).then(sockets => clients.push(...sockets));
    await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }

  console.log(`\n✅ All ${CONCURRENT_CLIENTS} connection attempts dispatched.`);
  
  // Keep alive for 60 seconds to process room assignments then teardown
  setTimeout(() => {
    console.log(`Load test concluded. Tearing down...`);
    clients.forEach(c => c.disconnect());
    process.exit(0);
  }, 60000);
}

runLoadTest().catch(console.error);
