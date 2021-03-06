var Effect = require('./Effect'),
    Vector = require('../../math/Vector'),
    inherit = require('../../utils/inherit'),
    math = require('../../math/math'),
    C = require('../../constants');

var Shake = function() {
    Effect.call(this);
    this.offset = new Vector();
};

inherit(Shake, Effect, {
    start: function(intensity, duration, direction, cb) {
        Effect.prototype.start.call(this);

        if(typeof direction === 'function') {
            cb = direction;
            direction = null;
        }

        if(typeof duration === 'function') {
            cb = duration;
            direction = null;
            duration = null;
        }

        if(typeof intensity === 'function') {
            cb = intensity;
            direction = null;
            duration = null;
            intensity = null;
        }

        this.intensity = intensity || 0.01;
        this.duration = duration || 1000;
        this.direction = direction || C.AXIS.BOTH;
        this.offset.x = this.offset.y = 0;
        this.cb = cb;

        return this;
    },
    stop: function() {
        Effect.prototype.stop.call(this);

        this.duration = this.offset.x = this.offset.y = 0;

        return this;
    },
    update: function(dt) {
        if(this.done) return;

        this.duration -= (dt * 1000);

        //pan back to the original position
        this.offset.x = -this.offset.x;
        this.offset.y = -this.offset.y;
        this.parent.pan(this.offset.x, this.offset.y);

        //check if we are complete
        if(this.duration <= 0) {
            this._complete();
        }
        //otherwise do the shake
        else {
            //pan to a random offset
            if(this.direction & C.AXIS.HORIZONTAL)
                this.offset.x = math.round(Math.random() * this.intensity * this.parent.size.x * 2 - this.intensity * this.parent.size.x);

            if (this.direction & C.AXIS.VERTICAL)
                this.offset.y = math.round(Math.random() * this.intensity * this.parent.size.y * 2 - this.intensity * this.parent.size.y);

            this.parent.pan(this.offset.x, this.offset.y);
        }
    }
});

module.exports = Shake;
