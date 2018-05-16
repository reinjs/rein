module.exports = app => {
  app.router.use('/', 'b.c');
  app.router.get('/', 'swagger:a.b.c', 'a.hello');
  app.router.get('/abc/:id(\\d+)', 'swagger:dec.afd', app.controller.a.hello);
  app.router.get('/ddd', 'test:dec.afd.ew3', app.controller.a.hello);
};