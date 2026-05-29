module.exports = {
  apps: [
    {
      name: "domi-telemetry",
      script: "src/server.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 4001
      }
    }
  ]
};
