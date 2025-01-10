type Options = {
	encoding: "8bitInt" | "16bitInt" | "32bitInt" | "32bitFloat";
	channels: number;
	sampleRate: number;
	flushingTime: number;
};

type TypedArray =
	| Int8Array<ArrayBuffer>
	| Int16Array<ArrayBuffer>
	| Int32Array<ArrayBuffer>
	| Float32Array<ArrayBuffer>;

export default class PCMPlayer {
	#option: Options;
	#samples: Float32Array<ArrayBuffer>;
	#interval: NodeJS.Timeout;
	#maxValue: number;
	#typedArray:
		| Int16ArrayConstructor
		| Int32ArrayConstructor
		| Float32ArrayConstructor
		| Int8ArrayConstructor;
	#audioCtx: AudioContext;
	#gainNode: GainNode;
	#startTime: number;

	constructor(option: Partial<Options>) {
		const defaults: Options = {
			encoding: "16bitInt",
			channels: 1,
			sampleRate: 8000,
			flushingTime: 1000,
		};
		this.#option = {
			...defaults,
			...option,
		};

		this.#samples = new Float32Array();
		this.flush = this.flush.bind(this);
		this.#interval = setInterval(this.flush, this.#option.flushingTime);
		this.#maxValue = this.#getMaxValue();
		this.#typedArray = this.#getTypedArray();
		this.#audioCtx = new (window.AudioContext || window.webkitAudioContext)();

		// context needs to be resumed on iOS and Safari (or it will stay in "suspended" state)
		this.#audioCtx.resume();
		this.#audioCtx.onstatechange = () => console.log(this.#audioCtx.state); // if you want to see "Running" state in console and be happy about it

		this.#gainNode = this.#audioCtx.createGain();
		this.#gainNode.gain.value = 1;
		this.#gainNode.connect(this.#audioCtx.destination);
		this.#startTime = this.#audioCtx.currentTime;
	}

	#getMaxValue() {
		const encodings = {
			"8bitInt": 128,
			"16bitInt": 32768,
			"32bitInt": 2147483648,
			"32bitFloat": 1,
		} as const;

		return encodings[this.#option.encoding]
			? encodings[this.#option.encoding]
			: encodings["16bitInt"];
	}

	#getTypedArray() {
		const typedArrays = {
			"8bitInt": Int8Array,
			"16bitInt": Int16Array,
			"32bitInt": Int32Array,
			"32bitFloat": Float32Array,
		};

		return typedArrays[this.#option.encoding]
			? typedArrays[this.#option.encoding]
			: typedArrays["16bitInt"];
	}

	static #isTypedArray(data: unknown): data is TypedArray {
		return (
			!!(data as TypedArray).byteLength &&
			!!(data as TypedArray).buffer &&
			(data as TypedArray).buffer.constructor === ArrayBuffer
		);
	}

	feed(data: TypedArray) {
		if (!PCMPlayer.#isTypedArray(data)) return;
		const newData = this.#getFormattedValue(data);
		const tmp = new Float32Array(this.#samples.length + newData.length);
		tmp.set(this.#samples, 0);
		tmp.set(newData, this.#samples.length);
		this.#samples = tmp;
	}

	#getFormattedValue(data: TypedArray) {
		const newData = new this.#typedArray(data.buffer);
		const float32 = new Float32Array(newData.length);
		for (let i = 0; i < newData.length; i++) {
			float32[i] = newData[i] / this.#maxValue;
		}
		return float32;
	}

	volume(volume: number) {
		this.#gainNode.gain.value = volume;
	}

	destroy() {
		if (this.#interval) {
			clearInterval(this.#interval);
		}
		this.#audioCtx.close();
	}

	flush() {
		if (!this.#samples.length) return;
		const bufferSource = this.#audioCtx.createBufferSource();
		const length = this.#samples.length / this.#option.channels;
		const audioBuffer = this.#audioCtx.createBuffer(
			this.#option.channels,
			length,
			this.#option.sampleRate,
		);

		for (let channel = 0; channel < this.#option.channels; channel++) {
			const audioData = audioBuffer.getChannelData(channel);
			let offset = channel;
			let decrement = 50;
			for (let i = 0; i < length; i++) {
				audioData[i] = this.#samples[offset];
				// fadein
				if (i < 50) {
					audioData[i] = (audioData[i] * i) / 50;
				}
				// fadeout
				if (i >= length - 51) {
					audioData[i] = (audioData[i] * decrement--) / 50;
				}
				offset += this.#option.channels;
			}
		}

		if (this.#startTime < this.#audioCtx.currentTime) {
			this.#startTime = this.#audioCtx.currentTime;
		}
		console.log(
			`start vs current ${this.#startTime} vs ${this.#audioCtx.currentTime} duration: ${audioBuffer.duration}`,
		);
		bufferSource.buffer = audioBuffer;
		bufferSource.connect(this.#gainNode);
		bufferSource.start(this.#startTime);
		this.#startTime += audioBuffer.duration;
		this.#samples = new Float32Array();
	}
}
