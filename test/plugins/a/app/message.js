const Agent = require('@reinjs/rein-class/agent');

module.exports = class Message extends Agent {
  constructor(...args) {
    super(...args);
  }
  
  async test2(data) {
    return data + 'shenyunjie3' + this.config.tet;
  }
};