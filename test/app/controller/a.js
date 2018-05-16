module.exports = class AController {
  constructor(ctx) {
    this.ctx = ctx;
    this.name = 'AController';
  }
  
  hello() {
    this.ctx.body = this.ctx.service.auth.c.hello('evio' + this.ctx.abc() + this.ctx.app.abc() + this.ctx.request.abc() + this.ctx.response.abc());
  }
};