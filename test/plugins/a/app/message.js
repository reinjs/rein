module.exports = app => {
  app.receive('test2', async data => {
    return data + 'shenyunjie2';
  });
};