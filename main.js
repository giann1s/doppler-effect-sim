function main() {

	function calc_observed_freq(observer, source, prop_speed) {
		
		observed_freq = 0;

		if (observer.x > source.x) {
			observed_freq = source.freq * (parseFloat(prop_speed) - parseFloat(observer.x_speed)) / (parseFloat(prop_speed) - parseFloat(source.x_speed));
		}
		else if (observer.x < source.x) {
			observed_freq = source.freq * (parseFloat(prop_speed) + parseFloat(observer.x_speed)) / (parseFloat(prop_speed) + parseFloat(source.x_speed));
		}
		else {
			observed_freq = source.freq
		}
		
		if (observed_freq < 0) {
			observed_freq = 0;
		}

		return Math.round(observed_freq)
	}

	function run_stop() {
		if (document.getElementById("run-button").textContent == "Run") {
			document.getElementById("run-button").textContent = "Stop";

			// Prevent propagation speed and scale from changing while the simulation is running
			document.getElementById("prop-speed").disabled = true;
			document.getElementById("scale").disabled = true;

			run = true;
		}
		else {
			document.getElementById("run-button").textContent = "Run";

			// Allow user to change propagation speed and scale
			document.getElementById("prop-speed").disabled = false;
			document.getElementById("scale").disabled = false;

			run = false;
		}
	}

	function visible(object, max_x, max_y) {
		if (object.x - object.rad <= max_x && object.x + object.rad >= 0 && object.y - object.rad <= max_y && object.y + object.rad >= 0) {
			return true
		}
		else {
			return false
		}
	}

	function reset_sim(are_visible) {
		if (document.getElementById("restart-if-not-vis").checked) {
			if (are_visible) {
				return false
			}
			else {
				return true
			}
		}
		else {
			return false;
		}
	}

	function draw_object(object) {
		ctx.beginPath();
		ctx.fillStyle = object.color;
		ctx.arc(object.x, object.y, object.rad, 2 * Math.PI, false)
		ctx.fill();
		ctx.closePath();
	}

	function draw_waves(waves, second, scale) {
		for (let wave of waves.list) {
			ctx.beginPath();
			ctx.strokeStyle = waves.color;
			ctx.lineWidth = 2;
			//ctx.arc(wave[0], wave[1], prop_speed * (second - wave[2]) * scale, 2 * Math.PI, false);
			ctx.arc(wave[0], canvas.height / 2, prop_speed * (second - wave[2]) * scale, 2 * Math.PI, false);
			ctx.stroke();
			ctx.closePath();
		}
	}

	function custom_positions() {
		if (document.getElementById("custom-positions").checked) {
			if (document.getElementById("source-custom-x").value == "") {
				document.getElementById("source-custom-x").value = 0;
				document.getElementById("observer-custom-x").value = 0;
			}
			document.getElementById("source-custom-x").disabled = false;
			document.getElementById("observer-custom-x").disabled = false;
		}
		else {
			document.getElementById("source-custom-x").disabled = true;
			document.getElementById("observer-custom-x").disabled = true;
		}
	}

	const FPS = 60;
	const FRAMETIME = 1 / FPS;

	// For automatically setting objects' positions (in px)
	const dist_border = 140;
	const dist_obj = 50;

	var run = false

	var sec = 0;
	var current_frame = 0;

	var observer = {
		x: 0,
		x_speed: 0,
		y: 0,
		y_speed: 0,
		color: "cyan",
		rad: 25,
	};

	var source = {
		x: 0,
		x_speed: 0,
		y: 0,
		y_speed: 0,
		freq: 0,
		color: "red",
		rad: 10,
	};

	var waves = {
		list: [], // Stores arrays that contain the x and y position of the object and the time (in sec) when the emission occured
		color: "#FF4444",
		last_emission: 0,
	};

	// Add event listeners
	document.getElementById("run-button").addEventListener("click", run_stop);
	document.getElementById("custom-positions").addEventListener("click", custom_positions)

	// Set color indicator colors
	document.getElementById("source-color-indicator").setAttribute("style", "color: " + source.color);
	document.getElementById("observer-color-indicator").setAttribute("style", "color: " + observer.color);

	/* Initialise Variables */

	// Canvas
	canvas = document.getElementById("canvas");
	ctx = canvas.getContext("2d");
	canvas.width = canvas.clientWidth
	canvas.height = canvas.clientHeight;

	// Other
	prop_speed = document.getElementById("prop-speed").value = 100;
	scale = document.getElementById("scale").value = 10;

	// Objects
	observer.x_speed = document.getElementById("observer-x-speed").value = 0;
	source.x_speed = document.getElementById("source-x-speed").value = -30;
	source.freq = document.getElementById("source-frequency").value = 6;

	function render_new_frame() {

		if (run == true && !reset_sim((visible(source, canvas.width, canvas.height) && visible(observer, canvas.width, canvas.height)))) {

			current_frame++;
			sec = current_frame / FPS;
			document.getElementById("time-meter").innerHTML = "Time elapsed (s): " + parseInt(sec);

			canvas.width = canvas.clientWidth;
			canvas.height = canvas.clientHeight;
			prop_speed = document.getElementById("prop-speed").value;
			scale = document.getElementById("scale").value;			

			// Observer
			observer.x_speed = document.getElementById("observer-x-speed").value;
			observer.x += observer.x_speed * FRAMETIME * scale;
			observer.y = canvas.height / 2;

			// Source
			source.x_speed = document.getElementById("source-x-speed").value;
			source.x += source.x_speed * FRAMETIME * scale;
			source.y = canvas.height / 2;
			source.freq = document.getElementById("source-frequency").value;
			
			document.getElementById("observed-freq").innerHTML = "Observed Frequency (Hz): " + calc_observed_freq(observer, source, prop_speed);

			// Waves
			max_disp_dist = Math.sqrt(canvas.width ** 2 + canvas.height ** 2)
			for (let wave of waves.list) {	// Remove distant waves
				if (prop_speed * (sec - wave[2]) * scale > max_disp_dist) {
					waves.list.shift();
				}
				else {
					break;
				}
			}
			if (source.freq != 0) {	// Add new waves
				new_waves = parseInt(source.freq * (sec - waves.last_emission));
				wave_period = 1 / source.freq;
				
				for (let i = 1; i <= new_waves; i++) {
					if (waves.list.length != 0 && prev_freq == source.freq) {
						waves.list.push([source.x, source.y, waves.last_emission + wave_period * i]);
					}
					else {
						waves.list.push([source.x, source.y, sec]);
					}
				}

				// Update last emission
				if (waves.list != 0) {
					waves.last_emission = waves.list.slice().reverse()[0][2];
				}
			}
			prev_freq = source.freq

			// Clear Canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Draw Frame
			draw_waves(waves, sec, scale);
			draw_object(observer);
			draw_object(source);
		}
		else {

			/* Reset Simulation */

			sec = 0;
			current_frame = 0;
			document.getElementById("time-meter").innerHTML = "Time elapsed (s): -";

			document.getElementById("observed-freq").innerHTML = "Observed Frequency (Hz): -";

			canvas.width = canvas.clientWidth;
			canvas.height = canvas.clientHeight;
			scale = document.getElementById("scale").value;

			// Clear Canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			if (document.getElementById("custom-positions").checked) {	// Set custom starting positions

				// Observer

				observer.x = document.getElementById("observer-custom-x").value;
				observer.y = canvas.height / 2;

				// Source
				source.x = document.getElementById("source-custom-x").value;
				source.y = canvas.height / 2;				
			}
			else {	// Automatically set positions

				observer.x_speed = document.getElementById("observer-x-speed").value;
				source.x_speed = document.getElementById("source-x-speed").value;

				if (observer.x_speed * source.x_speed > 0) {	// Same direction
					if (observer.x_speed > 0) {	// Positive Speeds
						if (observer.x_speed > source.x_speed) {
							observer.x = dist_border;
							source.x = dist_border + dist_obj;
						}
						else {
							observer.x = dist_border + dist_obj;
							source.x = dist_border;
						}
					}
					else {	// Ngative Speeds
						if (observer.x_speed > source.x_speed) {
							observer.x = canvas.width - dist_border;
							source.x = canvas.width - dist_border + dist_obj;
						}
						else {
							observer.x = canvas.width - dist_border + dist_obj;
							source.x = canvas.width - dist_border;
						}
					}
				}
				else {	// Opposite Direction
					if (observer.x_speed > source.x_speed) {
						observer.x = dist_border;
						source.x = canvas.width - dist_border;
					}
					else {
						observer.x = canvas.width - dist_border;
						source.x = dist_border;
						
					}
				}

				observer.y = canvas.height / 2;
				source.y = canvas.height / 2;
			}

			// Waves
			waves.list = [];
			waves.last_emission = 0;

			draw_object(observer);
			draw_object(source);
		}
	}
	setInterval(render_new_frame, 1000 / FPS)
}

document.addEventListener("DOMContentLoaded", main);
