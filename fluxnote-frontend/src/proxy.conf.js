const PROXY_CONFIG = [
  {
    context: ["/api"],
    target: "https://localhost:7041",
    secure: false,
    changeOrigin: true
  },
  {
    context: ["/hubs"],
    target: "https://localhost:7041",
    secure: false,
    changeOrigin: true,
    ws: true  // Necessário para WebSocket (SignalR)
  }
]

module.exports = PROXY_CONFIG;
