"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class IntervalTimer {
    constructor(callback, interval, runtime = null) {
        this.interval = interval;
        this.callback = callback;
        if (runtime) {
            this.runtime = runtime;
        }
        this.remaining = 0;
        this.state = 0;
    }
    pause() {
        if (this.state !== 1) {
            return;
        }
        this.remaining = this.interval - (new Date().getTime() - this.startTime);
        clearInterval(this.timerId);
        this.state = 2;
    }
    resume() {
        if (this.state !== 2) {
            return;
        }
        this.state = 3;
        setTimeout(this.timeoutCallback.bind(this), this.remaining);
    }
    reset() {
        this.stop();
        this.start();
    }
    stop() {
        if (this.runtimeId) {
            clearTimeout(this.runtimeId);
        }
        clearInterval(this.timerId);
        this.state = 0;
        this.remaining = 0;
    }
    start() {
        this.startTime = new Date().getTime();
        this.timerId = setInterval(this.callback, this.interval);
        this.state = 1;
        if (this.runtime) {
            this.runtimeId = setTimeout(() => {
                this.stop();
            }, this.runtime);
        }
    }
    timeoutCallback() {
        if (this.state !== 3) {
            return;
        }
        this.callback();
        this.startTime = new Date().getTime();
        this.timerId = setInterval(this.callback, this.interval);
        this.state = 1;
    }
}
exports.default = IntervalTimer;
//# sourceMappingURL=timer.js.map