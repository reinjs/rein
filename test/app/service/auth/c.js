module.exports = class CController {
  constructor(ctx) {
    this.ctx = ctx;
    this.name = 'CController - service';
  }
  
  abc() {
    return this.name;
  }
  
  hello(a) {
    return this.abc() + ' ' + a;
  }
};