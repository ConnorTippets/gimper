class XCF {
    version;

    static header = Buffer.from(new Uint8Array([103, 105, 109, 112, 32, 120, 99, 102, 32]));

    /**
     * Read .xcf from bytes
     * @param {Uint8Array} bytes - Bytes to read
     * @returns {XCF} - Parsed XCF
     */
    static async from_bytes(bytes) {
        const reader = new DataView(bytes.buffer, 13);
        const cursor = 0;

        const header = bytes.slice(0, 9);
        if (header.compare(XCF.header) !== 0) {
            throw Error("Invalid XCF");
        }

        console.log("good job, valid xcf");
    };
}

class XCFConverter {
    static async to_png(bytes) {
        XCF.from_bytes(bytes);
    };
}

export default XCFConverter;