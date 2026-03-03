const PROXY_CONFIG = [
  {
    context: ["/api"],
    target: "http://backend:5000",
    secure: false
  },
  {
    context: ["/hubs"],
    target: "http://backend:5000",
    secure: false,
    ws: true  // Necessário para WebSocket (SignalR)
  }
]

module.exports = PROXY_CONFIG;
