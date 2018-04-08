const { fork } = require('child_process');
const fs = require('fs');

const noop = () => {};
const SUCCESS_FILE_PATH = './tmp/fixtures/passing.ts';
const FAIL_FILE_PATH = './tmp/fixtures/failing.ts';

class Driver {
  constructor() {
    this.subscriptions = new Map();  
    this.wait = Promise.resolve();
  }

  subscribe(processEventName, listener) {
    this.subscriptions.set(processEventName, listener);
    return this;
  }

  startWatch({failFirst, pretty} = {}) {
    const params = ['--out', './tmp/output.js', failFirst ? FAIL_FILE_PATH : SUCCESS_FILE_PATH];
    if (pretty) {
      params.push('--pretty');
    }
    this.proc = fork('./lib/tsc-watch.js', params, { stdio: 'inherit' });

    this.subscriptions.forEach((handler, evName) =>
      this.proc.on('message', event => evName === event
        ? handler(event)
        : noop()));

    return this;
  }

  modifyAndSucceedAfter(wait = 0, isFailingPath) {
    this._extendWait(wait).then(() => fs.appendFileSync(SUCCESS_FILE_PATH, ' '));
    return this;
  }

  modifyAndFailAfter(wait = 0) {
    this._extendWait(wait).then(() => fs.appendFileSync(FAIL_FILE_PATH, '{{{'));
    return this;
  }

  reset() {
    if (this.proc && this.proc.kill) {
      this.proc.kill();
      this.proc = null;
    }

    this.subscriptions.clear();
    this.wait = Promise.resolve();
    return this;
  }

  _extendWait(ms) {
    return this.wait = this.wait.then(() => new Promise(resolve => setTimeout(resolve, ms)));
  } 
}

module.exports.driver = new Driver();
