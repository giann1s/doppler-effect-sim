document.addEventListener("DOMContentLoaded", main);

function main() {
	let sim = new Simulator;

	setInterval(() => sim.redraw(), 1000 / sim.FPS);
}

class Simulator {
	private readonly canvas: HTMLCanvasElement;
	private readonly context: CanvasRenderingContext2D;

	private readonly sourceColorIndicator: HTMLHeadingElement;
	private readonly observerColorIndicator: HTMLHeadingElement

	private readonly propSpeedInput: HTMLInputElement;
	private readonly scaleInput: HTMLInputElement;

	private readonly observerXSpeedInput: HTMLInputElement;
	private readonly sourceXSpeedInput: HTMLInputElement;
	private readonly sourceFreqInput: HTMLInputElement;

	private readonly sourceCustomXInput: HTMLInputElement;
	private readonly observerCustomXInput: HTMLInputElement;

	private readonly restartIfNotVisibleCheckbox: HTMLInputElement;
	private readonly customPosCheckbox: HTMLInputElement;

	private readonly observedFreqIndicator: HTMLHeadingElement;
	private readonly timeMeter: HTMLHeadingElement;

	private readonly runButton: HTMLButtonElement;

	readonly FPS: number;
	private readonly FRAMETIME: number;

	// For automatically setting objects' positions (in px)
	private readonly dist_border: number;
	private readonly dist_obj: number;

	private propSpeed: number;
	private scale: number;
	private restartIfNotVisible: boolean;

	private observer: {
		initial_x: number,
		x: number,
		x_speed: number,
		y: number,
		y_speed: number,
		color: string,
		rad: number,
	}

	private source: {
		initial_x: number,
		x: number,
		x_speed: number,
		y: number,
		y_speed: number,
		freq: number,
		prevFreq: number,
		color: string,
		rad: number,
	}

	private waves: {
		// Stores arrays that contain the x and y position of the object and the time (in sec) when the emission occurred
		list: Array<Array<number>>,
		color: string,
		last_emission: number
	}

	private run: boolean;

	private sec: number;
	private currentFrame: number;

	constructor() {
		this.canvas = document.getElementById("canvas") as HTMLCanvasElement;
    	this.context = this.canvas.getContext("2d") as CanvasRenderingContext2D;

		this.sourceColorIndicator = document.getElementById("source-color-indicator") as HTMLHeadingElement;
		this.observerColorIndicator = document.getElementById("observer-color-indicator") as HTMLHeadingElement;

		this.propSpeedInput = document.getElementById("prop-speed") as HTMLInputElement;
		this.scaleInput = document.getElementById("scale") as HTMLInputElement;

		this.observerXSpeedInput = document.getElementById("observer-x-speed") as HTMLInputElement;
		this.sourceXSpeedInput = document.getElementById("source-x-speed") as HTMLInputElement;
		this.sourceFreqInput = document.getElementById("source-frequency") as HTMLInputElement;

		this.sourceCustomXInput = document.getElementById("source-custom-x") as HTMLInputElement;
		this.observerCustomXInput = document.getElementById("observer-custom-x") as HTMLInputElement;

		this.restartIfNotVisibleCheckbox = document.getElementById("restart-if-not-vis") as HTMLInputElement;
		this.customPosCheckbox = document.getElementById("custom-positions") as HTMLInputElement;

		this.observedFreqIndicator = document.getElementById("observed-freq") as HTMLHeadingElement;
		this.timeMeter = document.getElementById("time-meter") as HTMLHeadingElement;

		this.runButton = document.getElementById("run-button") as HTMLButtonElement;

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

	private createEvents() {

		// Observer
		this.observerXSpeedInput.onchange = () => {
			this.observer.x_speed = parseFloat(this.observerXSpeedInput.value);
		};
		this.observerCustomXInput.onchange = () => {
			this.observer.x_speed = parseFloat(this.observerXSpeedInput.value);
		};

		//Source
		this.sourceXSpeedInput.onchange = () => {
			this.source.x_speed = parseFloat(this.sourceXSpeedInput.value);
		};
		this.sourceFreqInput.onchange = () => {
			this.source.freq = parseFloat(this.sourceFreqInput.value);
		};
		this.sourceCustomXInput.onchange = () => {
			this.source.x_speed = parseFloat(this.sourceXSpeedInput.value);
		};

		// Other
		this.propSpeedInput.onchange = () => {
		    this.propSpeed = parseFloat(this.propSpeedInput.value);
		};
		this.scaleInput.onchange = () => {
			this.scale = parseFloat(this.scaleInput.value);
		};
		this.restartIfNotVisibleCheckbox.onclick = () => {
			this.restartIfNotVisible = this.restartIfNotVisibleCheckbox.checked;
		};
		this.customPosCheckbox.onclick = () => {
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

			this.setInitialPositions();
		};

		this.runButton.onclick = () => {
			if (this.runButton.textContent == "Run") {
				this.runButton.textContent = "Stop";

				// Prevent propagation speed and scale from changing while the simulation is running
				this.propSpeedInput.disabled = true;
				this.scaleInput.disabled = true;

				this.run = true;
			}
			else {
				this.runButton.textContent = "Run";

				// Allow user to change propagation speed and scale
				this.propSpeedInput.disabled = false;
				this.scaleInput.disabled = false;

				this.run = false;
			}
		};
	}

	private setInitialPositions() {



	}

	private calc_observed_freq(observer, source, propSpeed) {

		let observed_freq = 0;

		if (observer.x > source.x) {
			observed_freq = source.freq * (parseFloat(propSpeed) - parseFloat(observer.x_speed)) / (parseFloat(propSpeed) - parseFloat(source.x_speed));
		}
		else if (observer.x < source.x) {
			observed_freq = source.freq * (parseFloat(propSpeed) + parseFloat(observer.x_speed)) / (parseFloat(propSpeed) + parseFloat(source.x_speed));
		}
		else {
			observed_freq = source.freq
		}

		if (observed_freq < 0) {
			observed_freq = 0;
		}

		return Math.round(observed_freq)
	}

	private visible(object, max_x, max_y) {
		if (object.x - object.rad <= max_x && object.x + object.rad >= 0 && object.y - object.rad <= max_y && object.y + object.rad >= 0) {
			return true
		}
		else {
			return false
		}
	}

	private draw_object(object) {
		let context = this.context;

		context.beginPath();
		context.fillStyle = object.color;
		context.arc(object.x, object.y, object.rad, 0, 2 * Math.PI, false)
		context.fill();
		context.closePath();
	}

	private draw_waves(waves, second, scale) {
		let canvas = this.canvas;
		let context = this.context;

		let propSpeed = this.propSpeed;

		for (let wave of waves.list) {
			context.beginPath();
			context.strokeStyle = waves.color;
			context.lineWidth = 2;
			//context.arc(wave[0], wave[1], propSpeed * (second - wave[2]) * scale, 0, 2 * Math.PI, false);
			context.arc(wave[0], canvas.height / 2, propSpeed * (second - wave[2]) * scale, 0, 2 * Math.PI, false);
			context.stroke();
			context.closePath();
		}
	}

	redraw() {
		let canvas = this.canvas;
		let context = this.context;

		if (this.run && ! (this.restartIfNotVisible &&
			!(
				this.visible(this.source, canvas.width, canvas.height) &&
				this.visible(this.observer, canvas.width, canvas.height)
			))) {

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
			let maxVisibleSpaceRad = Math.sqrt(canvas.width ** 2 + canvas.height ** 2)
			for (let wave of this.waves.list) {	// Remove distant waves
				if (this.propSpeed * (this.sec - wave[2]) * this.scale > maxVisibleSpaceRad) {
					this.waves.list.shift();
				}
				else {
					break;
				}
			}
			if (this.source.freq != 0) {	// Add new waves
				let new_waves = this.source.freq * (this.sec - this.waves.last_emission);
				let wavePeriod = 1 / this.source.freq;

				for (let i = 1; i <= new_waves; i++) {
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
			this.source.prevFreq = this.source.freq

			// Clear Canvas
			context.clearRect(0, 0, canvas.width, canvas.height);

			// Draw Frame
			this.draw_waves(this.waves, this.sec, this.scale);
			this.draw_object(this.observer);
			this.draw_object(this.source);
		}
		else {
			this.reset();

			if (this.customPosCheckbox.checked) {	// Set custom starting positions
				this.observer.x = parseInt(this.observerCustomXInput.value);
				this.observer.y = canvas.height / 2;

				this.source.x = parseInt(this.sourceCustomXInput.value);
				this.source.y = canvas.height / 2;
			}
			else {	// Automatically set positions

				if (this.observer.x_speed * this.source.x_speed > 0) {	// Same direction
					if (this.observer.x_speed > 0) {	// Positive Speeds
						if (this.observer.x_speed > this.source.x_speed) {
							this.observer.x = this.dist_border;
							this.source.x = this.dist_border + this.dist_obj;
						}
						else {
							this.observer.x = this.dist_border + this.dist_obj;
							this.source.x = this.dist_border;
						}
					}
					else {	// Negative Speeds
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
				else {	// Opposite Direction
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
	}

	private reset() {
		let canvas = this.canvas;
		let context = this.context;

		this.sec = 0;
		this.currentFrame = 0;

		this.timeMeter.innerHTML = "Time elapsed (s): -";
		this.observedFreqIndicator.innerHTML = "Observed Frequency (Hz): -";

		// Clear Canvas
		context.clearRect(0, 0, canvas.width, canvas.height);

		this.waves.list = [];
	    this.waves.last_emission = 0;
	}
}
