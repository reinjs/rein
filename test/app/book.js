// module.exports = app => {
//   app.receive('test1', async data => {
//     return data + 'shenyunjie';
//   });
// };

const Agent = require('@reinjs/rein-class/agent');

module.exports = class Message extends Agent {
  constructor(...args) {
    super(...args);
  }
  
  async test1(data) {
    return data + 'shenyunjie';
  }
};