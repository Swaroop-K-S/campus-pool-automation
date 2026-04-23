const { io } = require('socket.io-client');
const os = require('os');
const { performance } = require('perf_hooks');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';
const CONCURRENT_STUDENTS = 1500;
const CONCURRENT_HRS = 100;
const BATCH_SIZE = 50; 
const BATCH_DELAY_MS = 200;
const DRIVE_ID = 'test_drive_123';
const ROOM_ID = 'test_room_456'; 
// Note: Normally ROOM_ID needs to exist in Mongo to resolve the name, but our socket defaults to 'Unknown Room' safely if not found.

console.log(`Starting Load Test | Students: ${CONCURRENT_STUDENTS} | HRs: ${CONCURRENT_HRS}...`);
const studentClients = [];
const hrClients = [];
let adminClient = null;

let connectionsEstablished = 0;
let dispatchAlertsReceived = 0;
let burstStartTime = 0;
const latencies = [];

function printSystemStats() {
  const mem = process.memoryUsage();
  console.log(`\n--- System Status ---`);
  console.log(`RSS: ${Math.round(mem.rss / 1024 / 1024)} MB | Heap Used: ${Math.round(mem.heapUsed / 1024 / 1024)} MB`);
  console.log(`Connections Active: ${connectionsEstablished} | Dispatches Rx by Admin: ${dispatchAlertsReceived} / ${CONCURRENT_HRS}\n`);
}

function spawnClient(id, role = 'student') {
  return new Promise((resolve) => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: false,
      query: { usn: `${role.toUpperCase()}_LOAD_${id}`, role }
    });

    socket.on('connect', () => {
      connectionsEstablished++;
      if (role === 'student') {
        socket.emit('join:drive', DRIVE_ID);
        // Student normal traffic noise
        setInterval(() => socket.emit('ping'), 20000); 
      } else if (role === 'hr') {
        socket.emit('join:drive', DRIVE_ID);
      }
      resolve(socket);
    });

    socket.on('disconnect', () => connectionsEstablished--);
    socket.on('connect_error', (err) => resolve(null));
  });
}

async function spawnAdminClient() {
  return new Promise((resolve) => {
    adminClient = io(SOCKET_URL, { transports: ['websocket'], reconnection: false, query: { role: 'admin' } });
    adminClient.on('connect', () => {
      connectionsEstablished++;
      adminClient.emit('join:drive:admin', DRIVE_ID);
      
      adminClient.on('admin:dispatch_alert', (payload) => {
        dispatchAlertsReceived++;
        latencies.push(performance.now() - burstStartTime);
      });
      resolve(true);
    });
  });
}

function fireHrBurst() {
  console.log(`\n======================================================`);
  console.log(`🔫 [BURST FIRING] ${CONCURRENT_HRS} HR Clients triggering 'hr:dispatch_request'...`);
  console.log(`======================================================\n`);
  
  burstStartTime = performance.now();
  
  hrClients.forEach((hr, i) => {
    if (hr) {
      hr.emit('hr:dispatch_request', {
        roomId: ROOM_ID,
        driveId: DRIVE_ID,
        hrEmail: `hr_${i}@bench.mark`,
        requestType: 'technical'
      });
    }
  });
}

async function runLoadTest() {
  const statInterval = setInterval(printSystemStats, 3000);

  // Spawn Admin
  await spawnAdminClient();

  // Spawn HRs 
  for (let i = 0; i < CONCURRENT_HRS; i++) {
    hrClients.push(await spawnClient(i, 'hr'));
  }

  // Spawn Students in batches for noise
  for (let i = 0; i < CONCURRENT_STUDENTS; i += BATCH_SIZE) {
    const batch = [];
    for (let j = 0; j < BATCH_SIZE && (i + j) < CONCURRENT_STUDENTS; j++) {
      batch.push(spawnClient(i + j, 'student'));
    }
    const sockets = await Promise.all(batch);
    studentClients.push(...sockets.filter(Boolean));
    await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }

  console.log(`\n✅ Background connection mesh established.`);
  
  // At Exactly 10 seconds post-mesh, Fire Burst
  setTimeout(fireHrBurst, 10000);
  
  // Conclude 5 seconds post-burst
  setTimeout(() => {
    clearInterval(statInterval);
    
    // Calculate P95 Latency
    latencies.sort((a,b) => a - b);
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const avg = latencies.length > 0 ? (latencies.reduce((a,b)=>a+b, 0) / latencies.length) : 0;
    
    console.log(`\n🏁 Load Test Concluded`);
    console.log(`--- Dispatch Delivery Metrics ---`);
    console.log(`Dispatched: ${CONCURRENT_HRS}`);
    console.log(`Delivered to Admin: ${dispatchAlertsReceived}`);
    console.log(`Avg Latency: ${avg.toFixed(2)}ms`);
    console.log(`P95 Latency: ${p95.toFixed(2)}ms`);
    
    console.log(`Tearing down sockets...`);
    adminClient.disconnect();
    hrClients.forEach(c => c?.disconnect());
    studentClients.forEach(c => c?.disconnect());
    process.exit(0);
  }, 15000 + 10000); 
}

runLoadTest().catch(console.error);
