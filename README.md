# rein

The main framework of reinjs

## Install

```shell
npm i @reinjs/rein
```

## Usage

Use in common project:

```javascript
const Worker = require('@reinjs/rein');
const worker = new Worker({
  cwd: __dirname
});
worker.listen();
```

Use in cluster:

```javascript
const Cluster = require('@reinjs/rein-cluster');
const cluster = new Cluster({
  cwd: __dirname,
  agents: ['book'],
  timeout: 10000,
  framework: '@reinjs/rein'
});
cluster.listen().then(() => console.log('cluster is ok')).catch(e => console.error(e));
```

More API see document(coming soon...).

# License

It is [MIT licensed](https://opensource.org/licenses/MIT).