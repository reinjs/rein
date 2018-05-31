module.exports = app => {
  app.started(() => console.log('started'));
  app.beforeDestroy(() => console.log('beforeDestroy'));
  app.destroyed(() => console.log('destroyed'));
  app.ready(() => console.log(app.config.agent));
};