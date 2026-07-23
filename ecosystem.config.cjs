module.exports = {
  apps: [
    {
      name: 'card-collection-tracker',
      cwd: __dirname,
      script: 'npm',
      args: 'run preview:host',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
