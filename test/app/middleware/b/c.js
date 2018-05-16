module.exports = app => {
  return async (ctx, next) => {
    // console.log('middleware in b.c', ctx.app.router.extra);
    await next();
  }
};