class Property {
    /**
     * Specific property type
     * @type {Number}
     */
    type;

    /**
     * Underlying data
     * @type {ArrayBuffer}
     */
    bytes;

    /**
     * @param {Number} type - Specific property type
     * @param {ArrayBuffer} bytes - Underlying data
     */
    constructor(type, bytes) {
        this.type = type;
        this.bytes = bytes;
    }
}

class Reader {
    /**
     * Underlying data
     * @type {ArrayBuffer}
     */
    bytes;

    /**
     * Internal reader
     * @type {DataView}
     */
    r;

    /**
     * Cursor
     * @type {Number}
     */
    cursor;

    /**
     * @param {DataView} r - Internal reader
     */
    constructor(r) {
        this.r = r;
        this.bytes = r.buffer;
        this.cursor = 0;
    }

    /**
     * Get a uint32 and advance 4 bytes
     * @returns {Number} Parsed uint32
     */
    getUint32AndAdvance() {
        this.cursor += 4;
        return this.r.getUint32(this.cursor - 4);
    }

    /**
     * Get any amount of bytes
     * @param {Number} amt - How many bytes to get
     * @returns {ArrayBuffer} Returned buffer
     */
    getArbitraryBytesAsBuffer(amt) {
        const cur_pos = this.r.byteOffset + this.cursor;
        return this.bytes.slice(cur_pos, cur_pos + amt);
    }

    /**
     * Get any amount of bytes and advance
     * @param {Number} amt - How many bytes to get
     * @returns {ArrayBuffer} Returned buffer
     */
    getArbitraryBytesAsBufferAndAdvance(amt) {
        const data = this.getArbitraryBytesAsBuffer(amt);
        this.cursor += amt;
        return data;
    }
}

class XCF {
    /**
     * XCF file version
     * @type {Number}
     */
    version;

    /**
     * Canvas width
     * @type {Number}
     */
    width;

    /**
     * Canvas height
     * @type {Number}
     */
    height;

    /**
     * Image color mode
     * @type {Number}
     */
    color_mode;

    /**
     * Image precision
     * @type {number}
     */
    precision;

    /**
     * Image properties
     * @type {ArrayBuffer[]}
     */
    properties;

    /**
     * @param {Number} version - XCF file version
     * @param {Number} width - Canvas width
     * @param {Number} height - Canvas height
     * @param {Number} color_mode - Image color mode
     * @param {Number} precision - Image precision
     * @param {ArrayBuffer[]} properties - Image properties
     */
    constructor(version, width, height, color_mode, precision, properties) {
        this.version = version;
        this.width = width;
        this.height = height;
        this.color_mode = color_mode;
        this.precision = precision;
        this.properties = properties;
    };

    static header = Buffer.from(new Uint8Array([103, 105, 109, 112, 32, 120, 99, 102, 32]));

    /**
     * Read .xcf from bytes
     * @param {Uint8Array} bytes - Bytes to read
     * @returns {XCF} - Parsed XCF
     */
    static async from_bytes(bytes) {
        const reader = new Reader(new DataView(bytes.buffer, 14)); // +1 to skip extra 0

        // All .xcf's start with "gimp xcf "
        const header = bytes.slice(0, 9);
        if (header.compare(XCF.header) !== 0) {
            throw Error("Invalid XCF");
        }

        // Immediately following is the version.
        // Version 0 is "file", all others are "vXXX".
        const raw_ver = new TextDecoder().decode(bytes.slice(9, 13));
        let version = 0;

        if (raw_ver !== "file") {
            version = parseInt(raw_ver.slice(1));
        }

        const width = reader.getUint32AndAdvance();
        const height = reader.getUint32AndAdvance();

        const color_mode = reader.getUint32AndAdvance();

        let precision;
        if (version >= 4) {
            precision = reader.getUint32AndAdvance();
        }

        // List of image properties is next
        let properties = [];
        while (true) {
            const type = reader.getUint32AndAdvance();
            const length = reader.getUint32AndAdvance();

            if (type === 0 && length === 0) { // End of list
                break;
            }

            const data = reader.getArbitraryBytesAsBufferAndAdvance(length);
            properties.push(new Property(type, data));
        };

        return new this(version, width, height, color_mode, precision, properties);
    };
}

class XCFConverter {
    static async to_png(bytes) {
        console.log(await XCF.from_bytes(bytes));
    };
}

export default XCFConverter;