module.exports = app => {
  app.receive('test1', async data => {
    return data + 'shenyunjie';
  });
};