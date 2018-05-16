const Worker = require('./lib/worker');

module.exports = class WorkerRuntime extends Worker {
  constructor(app) {
    super();
    this.$app = app;
    this.$server = null;
    this.$inCluster = true;
  }
  
  /**
   * receive message from upstream
   * @param msg
   * @returns {Promise<void>}
   */
  async message(msg) {
  
  }
  
  /**
   * how to create service?
   * @returns {Promise<void>}
   */
  async create() {
    this.config.cwd = this.$app._argv.cwd;
    this.config.service = this.$app._argv.service;
    this.$server = await this.listen();
  }
  
  /**
   * how to destroy service?
   * @param signal
   * @returns {Promise<void>}
   */
  async destroy(signal) {
    if (this.$server) {
      this.$server.close();
    }
  }
};