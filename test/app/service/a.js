module.exports = class AController {
  constructor() {
    this.name = 'AController';
  }
  
  hello(ctx) {
    ctx.body = 'a, ok';
  }
};