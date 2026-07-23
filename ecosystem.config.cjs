module.exports = {
  apps: [
    {
      name: 'card-collection-tracker',
      cwd: __dirname,
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port 4173 --strictPort',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
