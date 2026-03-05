class XCF {
    version;

    /**
     * Read .xcf from bytes
     * @param {Uint8Array} bytes - Bytes to read
     * @returns {XCF} - Parsed XCF
     */
    static async from_bytes(bytes) {
        const reader = new DataView(bytes.buffer, 13);
        const cursor = 0;

        console.log(new TextDecoder().decode(bytes.slice(0, 13)));
    };
}

class XCFConverter {
    static async to_png(bytes) {
        XCF.from_bytes(bytes);
    };
}

export default XCFConverter;