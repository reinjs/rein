module.exports = class CController {
  constructor() {
    this.name = 'AController';
  }
  
  hello(ctx) {
    ctx.body = 'c, ok';
  }
};