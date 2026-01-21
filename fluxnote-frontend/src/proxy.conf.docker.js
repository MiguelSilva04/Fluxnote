const PROXY_CONFIG = [
  {
    context: [
      "/api"
    ],
    target: "http://backend:5000",
    secure: false
  }
]

module.exports = PROXY_CONFIG;
