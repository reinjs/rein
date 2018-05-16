module.exports = class AController {
  constructor(ctx) {
    this.ctx = ctx;
    this.name = 'AController';
  }
  
  async hello() {
    const value = await this.ctx.sendback('book', 'test1', 'love ');
    const value2 = await this.ctx.sendback('book', 'test2', 'love ');
    this.ctx.body = this.ctx.service.auth.c.hello('evio' + this.ctx.abc() + this.ctx.app.abc() + this.ctx.request.abc() + this.ctx.response.abc() + ' ' + value + ' ' + value2);
  }
};