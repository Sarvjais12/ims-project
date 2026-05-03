const http = require('http')

const events = require('./mock-failure.json').events

function sendSignal(signal) {
  const body = JSON.stringify(signal)
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/signals',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }
  const req = http.request(options, res => {
    console.log(`[Step] Sent ${signal.componentId} → ${res.statusCode}`)
  })
  req.write(body)
  req.end()
}

console.log('Simulating RDBMS → MCP cascade failure...')
events.forEach(event => {
  setTimeout(() => sendSignal(event.signal), event.delay_ms)
})