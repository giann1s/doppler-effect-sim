document.addEventListener("DOMContentLoaded", main);
function main() {
    var sim = new Simulator;
    setInterval(function () { return sim.redraw(); }, 1000 / sim.FPS);
}
var Simulator = /** @class */ (function () {
    function Simulator() {
        this.canvas = document.getElementById("canvas");
        this.context = this.canvas.getContext("2d");
        this.sourceColorIndicator = document.getElementById("source-color-indicator");
        this.observerColorIndicator = document.getElementById("observer-color-indicator");
        this.propSpeedInput = document.getElementById("prop-speed");
        this.scaleInput = document.getElementById("scale");
        this.observerXSpeedInput = document.getElementById("observer-x-speed");
        this.sourceXSpeedInput = document.getElementById("source-x-speed");
        this.sourceFreqInput = document.getElementById("source-frequency");
        this.sourceCustomXInput = document.getElementById("source-custom-x");
        this.observerCustomXInput = document.getElementById("observer-custom-x");
        this.restartIfNotVisibleCheckbox = document.getElementById("restart-if-not-vis");
        this.customPosCheckbox = document.getElementById("custom-positions");
        this.observedFreqIndicator = document.getElementById("observed-freq");
        this.timeMeter = document.getElementById("time-meter");
        this.runButton = document.getElementById("run-button");
        this.FPS = 60;
        this.FRAMETIME = 1 / this.FPS;
        this.dist_border = 140;
        this.dist_obj = 50;
        this.propSpeedInput.value = "100";
        this.propSpeed = parseFloat(this.propSpeedInput.value);
        this.scaleInput.value = "10";
        this.scale = parseFloat(this.scaleInput.value);
        this.restartIfNotVisibleCheckbox.checked = true;
        this.restartIfNotVisible = this.restartIfNotVisibleCheckbox.checked;
        this.observer = {
            initial_x: 0,
            x: 0,
            x_speed: 0,
            y: 0,
            y_speed: 0,
            color: "cyan",
            rad: 25,
        };
        this.source = {
            initial_x: 0,
            x: 0,
            x_speed: 0,
            y: 0,
            y_speed: 0,
            freq: 0,
            prevFreq: 0,
            color: "red",
            rad: 10,
        };
        this.waves = {
            list: [],
            color: "#FF4444",
            last_emission: 0,
        };
        this.observerXSpeedInput.value = "0";
        this.sourceXSpeedInput.value = "-30";
        this.sourceFreqInput.value = "6";
        this.observer.x_speed = parseFloat(this.observerXSpeedInput.value);
        this.source.x_speed = parseFloat(this.sourceXSpeedInput.value);
        this.source.freq = parseFloat(this.sourceFreqInput.value);
        // Set color indicator colors
        this.sourceColorIndicator.setAttribute("style", "color: " + this.source.color);
        this.observerColorIndicator.setAttribute("style", "color: " + this.observer.color);
        this.run = false;
        this.createEvents();
        this.redraw();
    }
    Simulator.prototype.createEvents = function () {
        var _this = this;
        // Observer
        this.observerXSpeedInput.onchange = function () {
            _this.observer.x_speed = parseFloat(_this.observerXSpeedInput.value);
        };
        this.observerCustomXInput.onchange = function () {
            _this.observer.x_speed = parseFloat(_this.observerXSpeedInput.value);
        };
        //Source
        this.sourceXSpeedInput.onchange = function () {
            _this.source.x_speed = parseFloat(_this.sourceXSpeedInput.value);
        };
        this.sourceFreqInput.onchange = function () {
            _this.source.freq = parseFloat(_this.sourceFreqInput.value);
        };
        this.sourceCustomXInput.onchange = function () {
            _this.source.x_speed = parseFloat(_this.sourceXSpeedInput.value);
        };
        // Other
        this.propSpeedInput.onchange = function () {
            _this.propSpeed = parseFloat(_this.propSpeedInput.value);
        };
        this.scaleInput.onchange = function () {
            _this.scale = parseFloat(_this.scaleInput.value);
        };
        this.restartIfNotVisibleCheckbox.onclick = function () {
            _this.restartIfNotVisible = _this.restartIfNotVisibleCheckbox.checked;
        };
        this.customPosCheckbox.onclick = function () {
            _this.posHandler();
        };
        this.runButton.onclick = function () {
            if (_this.runButton.textContent == "Run") {
                _this.runButton.textContent = "Stop";
                // Prevent propagation speed and scale from changing while the simulation is running
                _this.propSpeedInput.disabled = true;
                _this.scaleInput.disabled = true;
                _this.run = true;
            }
            else {
                _this.runButton.textContent = "Run";
                // Allow user to change propagation speed and scale
                _this.propSpeedInput.disabled = false;
                _this.scaleInput.disabled = false;
                _this.run = false;
            }
        };
    };
    Simulator.prototype.posHandler = function () {
        if (this.customPosCheckbox.checked) {
            if (this.sourceCustomXInput.value == "") {
                this.sourceCustomXInput.value = "0";
                this.observerCustomXInput.value = "0";
            }
            this.sourceCustomXInput.disabled = false;
            this.observerCustomXInput.disabled = false;
        }
        else {
            this.sourceCustomXInput.disabled = true;
            this.observerCustomXInput.disabled = true;
        }
    };
    Simulator.prototype.calc_observed_freq = function (observer, source, propSpeed) {
        var observed_freq = 0;
        if (observer.x > source.x) {
            observed_freq = source.freq * (parseFloat(propSpeed) - parseFloat(observer.x_speed)) / (parseFloat(propSpeed) - parseFloat(source.x_speed));
        }
        else if (observer.x < source.x) {
            observed_freq = source.freq * (parseFloat(propSpeed) + parseFloat(observer.x_speed)) / (parseFloat(propSpeed) + parseFloat(source.x_speed));
        }
        else {
            observed_freq = source.freq;
        }
        if (observed_freq < 0) {
            observed_freq = 0;
        }
        return Math.round(observed_freq);
    };
    Simulator.prototype.visible = function (object, max_x, max_y) {
        if (object.x - object.rad <= max_x && object.x + object.rad >= 0 && object.y - object.rad <= max_y && object.y + object.rad >= 0) {
            return true;
        }
        else {
            return false;
        }
    };
    Simulator.prototype.draw_object = function (object) {
        var context = this.context;
        context.beginPath();
        context.fillStyle = object.color;
        context.arc(object.x, object.y, object.rad, 0, 2 * Math.PI, false);
        context.fill();
        context.closePath();
    };
    Simulator.prototype.draw_waves = function (waves, second, scale) {
        var canvas = this.canvas;
        var context = this.context;
        var propSpeed = this.propSpeed;
        for (var _i = 0, _a = waves.list; _i < _a.length; _i++) {
            var wave = _a[_i];
            context.beginPath();
            context.strokeStyle = waves.color;
            context.lineWidth = 2;
            //context.arc(wave[0], wave[1], propSpeed * (second - wave[2]) * scale, 0, 2 * Math.PI, false);
            context.arc(wave[0], canvas.height / 2, propSpeed * (second - wave[2]) * scale, 0, 2 * Math.PI, false);
            context.stroke();
            context.closePath();
        }
    };
    Simulator.prototype.redraw = function () {
        var canvas = this.canvas;
        var context = this.context;
        if (this.run && !(this.restartIfNotVisible &&
            !(this.visible(this.source, canvas.width, canvas.height) &&
                this.visible(this.observer, canvas.width, canvas.height)))) {
            this.currentFrame++;
            this.sec = this.currentFrame / this.FPS;
            this.timeMeter.innerHTML = "Time elapsed (s): " + Math.floor(this.sec).toString();
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            this.observer.x += this.observer.x_speed * this.FRAMETIME * this.scale;
            this.observer.y = canvas.height / 2;
            this.source.x += this.source.x_speed * this.FRAMETIME * this.scale;
            this.source.y = canvas.height / 2;
            this.observedFreqIndicator.innerHTML = "Observed Frequency (Hz): " + this.calc_observed_freq(this.observer, this.source, this.propSpeed);
            // Waves
            var maxVisibleSpaceRad = Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2));
            for (var _i = 0, _a = this.waves.list; _i < _a.length; _i++) { // Remove distant waves
                var wave = _a[_i];
                if (this.propSpeed * (this.sec - wave[2]) * this.scale > maxVisibleSpaceRad) {
                    this.waves.list.shift();
                }
                else {
                    break;
                }
            }
            if (this.source.freq != 0) { // Add new waves
                var new_waves = this.source.freq * (this.sec - this.waves.last_emission);
                var wavePeriod = 1 / this.source.freq;
                for (var i = 1; i <= new_waves; i++) {
                    if (this.waves.list.length != 0 && this.source.prevFreq == this.source.freq) {
                        this.waves.list.push([this.source.x, this.source.y, this.waves.last_emission + wavePeriod * i]);
                    }
                    else {
                        this.waves.list.push([this.source.x, this.source.y, this.sec]);
                    }
                }
                // Update last emission
                if (this.waves.list.length != 0) {
                    this.waves.last_emission = this.waves.list.slice().reverse()[0][2];
                }
            }
            this.source.prevFreq = this.source.freq;
            // Clear Canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            // Draw Frame
            this.draw_waves(this.waves, this.sec, this.scale);
            this.draw_object(this.observer);
            this.draw_object(this.source);
        }
        else {
            this.reset();
            if (this.customPosCheckbox.checked) { // Set custom starting positions
                this.observer.x = parseInt(this.observerCustomXInput.value);
                this.observer.y = canvas.height / 2;
                this.source.x = parseInt(this.sourceCustomXInput.value);
                this.source.y = canvas.height / 2;
            }
            else { // Automatically set positions
                if (this.observer.x_speed * this.source.x_speed > 0) { // Same direction
                    if (this.observer.x_speed > 0) { // Positive Speeds
                        if (this.observer.x_speed > this.source.x_speed) {
                            this.observer.x = this.dist_border;
                            this.source.x = this.dist_border + this.dist_obj;
                        }
                        else {
                            this.observer.x = this.dist_border + this.dist_obj;
                            this.source.x = this.dist_border;
                        }
                    }
                    else { // Negative Speeds
                        if (this.observer.x_speed > this.source.x_speed) {
                            this.observer.x = canvas.width - this.dist_border;
                            this.source.x = canvas.width - this.dist_border + this.dist_obj;
                        }
                        else {
                            this.observer.x = canvas.width - this.dist_border + this.dist_obj;
                            this.source.x = canvas.width - this.dist_border;
                        }
                    }
                }
                else { // Opposite Direction
                    if (this.observer.x_speed > this.source.x_speed) {
                        this.observer.x = this.dist_border;
                        this.source.x = canvas.width - this.dist_border;
                    }
                    else {
                        this.observer.x = canvas.width - this.dist_border;
                        this.source.x = this.dist_border;
                    }
                }
                this.observer.y = canvas.height / 2;
                this.source.y = canvas.height / 2;
            }
            this.draw_object(this.observer);
            this.draw_object(this.source);
        }
    };
    Simulator.prototype.reset = function () {
        var canvas = this.canvas;
        var context = this.context;
        this.sec = 0;
        this.currentFrame = 0;
        this.timeMeter.innerHTML = "Time elapsed (s): -";
        this.observedFreqIndicator.innerHTML = "Observed Frequency (Hz): -";
        // Clear Canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        this.waves.list = [];
        this.waves.last_emission = 0;
    };
    return Simulator;
}());
//# sourceMappingURL=main.js.map