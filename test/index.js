const path = require('path');
const Worker = require('../index').Worker;

const app = new Worker({
  cwd: __dirname
});

app.listen(8080);