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

    static header = Buffer.from(new Uint8Array([103, 105, 109, 112, 32, 120, 99, 102, 32]));

    /**
     * Read .xcf from bytes
     * @param {Uint8Array} bytes - Bytes to read
     * @returns {XCF} - Parsed XCF
     */
    static async from_bytes(bytes) {
        const reader = new DataView(bytes.buffer, 14); // +1 to skip extra 0
        let cursor = 0;

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

        console.log(version);

        const width = reader.getUint32();
        const height = reader.getUint32(cursor + 4);
        cursor += 8;

        console.log(`${width}x${height}`);

        const color_mode = reader.getUint32(cursor);
        cursor += 4;

        console.log(color_mode);

        const precision = reader.getUint32(cursor);
        cursor += 4;

        console.log(precision);
    };
}

class XCFConverter {
    static async to_png(bytes) {
        XCF.from_bytes(bytes);
    };
}

export default XCFConverter;