module.exports = {
  apps: [
    {
      name: 'intranet-hispa',
      script: 'npm',
      args: 'run preview',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
      restart_delay: 3000,
      max_restarts: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
