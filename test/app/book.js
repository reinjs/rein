// module.exports = app => {
//   app.receive('test1', async data => {
//     return data + 'shenyunjie';
//   });
// };

module.exports = class Message {
  constructor(app) {
    this.app = app;
  }
  
  async test1(data) {
    return data + 'shenyunjie';
  }
};