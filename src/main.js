class Reader {
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
        this.cursor = 0;
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
     * @param {Number} version - XCF file version
     * @param {Number} width - Canvas width
     * @param {Number} height - Canvas height
     * @param {Number} color_mode - Image color mode
     * @param {Number} precision - Image precision
     */
    constructor(version, width, height, color_mode, precision) {
        this.version = version;
        this.width = width;
        this.height = height;
        this.color_mode = color_mode;
        this.precision = precision;
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

        const width = reader.r.getUint32();
        const height = reader.r.getUint32(reader.cursor + 4);
        reader.cursor += 8;

        const color_mode = reader.r.getUint32(reader.cursor);
        reader.cursor += 4;

        let precision;
        if (version >= 4) {
            precision = reader.r.getUint32(reader.cursor);
            reader.cursor += 4;
        }

        return new this(version, width, height, color_mode, precision);
    };
}

class XCFConverter {
    static async to_png(bytes) {
        console.log(await XCF.from_bytes(bytes));
    };
}

export default XCFConverter;