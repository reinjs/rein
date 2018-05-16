module.exports = app => {
  app.router.get('/', app.controller.a.hello);
};