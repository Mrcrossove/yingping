// PM2 进程管理配置
// 部署: pm2 start ecosystem.config.js
// 查看: pm2 status
// 日志: pm2 logs beverage-server

module.exports = {
  apps: [
    {
      name: 'beverage-server',
      script: './dist/main.js',
      cwd: './server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: './server/.env',
      // 自动重启配置
      max_memory_restart: '500M',
      // 日志
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
}
