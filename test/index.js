const Cluster = require('@reinjs/rein-cluster');
const cluster = new Cluster({
  cwd: __dirname,
  // agents: ['a', 'b', 'c', 'e'],
  timeout: 10000,
  framework: '/Users/shenyunjie/CodeBox/reinjs/rein'
});

cluster.listen().then(() => console.log('cluster is ok')).catch(e => console.error(e));