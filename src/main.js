class Tile {
    /**
     * Raw pixel data
     * @type {Number[][]}
     */
    data;

    /**
     * @param {Number[][]} data - Raw pixel data
     */
    constructor(data) {
        this.data = data;
    }

    /**
     * Read tile from bytes
     * @param {Reader} reader - Reader seeked to beginning of tile
     * @param {Number} compression_type - XCF pixel compression type
     * @param {Number} bpp - XCF pixel bytes per pixel
     * @returns {Tile} Parsed tile
     */
    static async from_bytes(reader, compression_type, bpp) {
        switch (compression_type) {
            case 1:
                let concatenated_byte_arrays = [];
                for (let byte = 0; byte < bpp; byte++) {
                    let bytes_data = new Uint8Array();
                    while (bytes_data.length < 4096) {
                        let n = reader.getUint8AndAdvance();

                        let data;
                        if (0 <= n && n < 127) {
                            data = new Uint8Array(Array(n + 1).fill(reader.getUint8AndAdvance()));
                        } else if (n === 127) {
                            const p = reader.getUint8AndAdvance();
                            const q = reader.getUint8AndAdvance();
                            const amt = p * 256 + q;
                            data = new Uint8Array(Array(amt).fill(reader.getUint8AndAdvance()));
                        } else if (n === 128) {
                            const p = reader.getUint8AndAdvance();
                            const q = reader.getUint8AndAdvance();
                            const amt = p * 256 + q;
                            data = new Uint8Array(reader.getArbitraryBytesAsBufferAndAdvance(amt));
                        } else if (128 < n && n < 256) {
                            data = new Uint8Array(reader.getArbitraryBytesAsBufferAndAdvance(256 - n));
                        } else {
                            throw Error("8-bit value is not 8-bit. How are you seeing this.");
                        }

                        let temp_arr = new Uint8Array(bytes_data.length + data.length);
                        temp_arr.set(bytes_data);
                        temp_arr.set(data, bytes_data.length);
                        bytes_data = temp_arr;
                    }
                    concatenated_byte_arrays.push(Array.from(bytes_data));
                }

                const pixel_data = concatenated_byte_arrays[0].map((_, colIndex) => concatenated_byte_arrays.map(row => row[colIndex]));

                return new this(pixel_data);
            default: throw Error("Unrecognized compression type");
        }
    }
}

class Level {
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
     * Pixel tile pointers
     * @type {Number[]}
     */
    tilePtrs;

    /**
     * Pixel tiles
     * @type {Tile[]}
     */
    tiles;

    /**
     * @param {Number} width - Canvas width
     * @param {Number} height - Canvas height
     * @param {Number[]} tilePtrs - Pixel tile pointers
     */
    constructor(width, height, tilePtrs) {
        this.width = width;
        this.height = height;
        this.tilePtrs = tilePtrs;
    }

    /**
     * Read level from bytes
     * @param {Reader} reader - Reader seeked to beginning of level
     * @param {Number} version - XCF version for pointers
     * @returns {Level} - Parsed level
     */
    static async from_bytes(reader, version) {
        const width = reader.getUint32AndAdvance();
        const height = reader.getUint32AndAdvance();

        let tiles = [];
        while (true) {
            let pointer;
            if (version < 11) {
                pointer = reader.getUint32AndAdvance();
            } else {
                pointer = reader.getUint64AndAdvance();
            }

            if (pointer === 0) {
                break;
            }

            tiles.push(pointer);
        }

        return new this(width, height, tiles);
    }
}

class PixelHierarchy {
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
     * Bytes per pixel
     * @type {Number}
     */
    bpp;

    /**
     * Level structure
     * @type {Level}
     */
    level;

    /**
     * @param {Number} width - Canvas width
     * @param {Number} height - Canvas height
     * @param {Number} bpp - Bytes per pixel
     * @param {Level} level - Level structure
     */
    constructor(width, height, bpp, level) {
        this.width = width;
        this.height = height;
        this.bpp = bpp;
        this.level = level;
    }

    /**
     * Read hierarchy from bytes
     * @param {Reader} reader - Reader seeked to beginning of hierarchy
     * @param {Number} version - XCF version for pointers
     * @returns {PixelHierarchy} - Parsed hierarchy
     */
    static async from_bytes(reader, version) {
        const width = reader.getUint32AndAdvance();
        const height = reader.getUint32AndAdvance();
        const bpp = reader.getUint32AndAdvance();

        let lptr;
        if (version < 11) {
            lptr = reader.getUint32AndAdvance();
        } else {
            lptr = reader.getUint64AndAdvance();
        }

        const cur_pos = reader.relToStart(reader.cursor);
        reader.seek(lptr);
        const level = await Level.from_bytes(reader, version);
        reader.seek(cur_pos);

        while (true) {
            let pointer;
            if (version < 11) {
                pointer = reader.getUint32AndAdvance();
            } else {
                pointer = reader.getUint64AndAdvance();
            }

            if (pointer === 0) {
                break;
            }
        }

        return new this(width, height, bpp, level);
    }
}

class Layer {
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
     * Layer type
     * @type {Number}
     */
    type;

    /**
     * Layer name
     * @type {String}
     */
    name;

    /**
     * Layer properties
     * @type {Property[]}
     */
    properties

    /**
     * Hierarchy structure
     * @type {PixelHierarchy}
     */
    hierarchy;

    /**
     * Layer mask
     * @type {number}
     */
    mask;

    /**
     * Layer effects
     * @type {number[]}
     */
    effects;

    /**
     * @param {Number} width - Canvas width
     * @param {Number} height - Canvas height
     * @param {Number} type - Layer type
     * @param {String} name - Layer name
     * @param {Property[]} properties - Layer properties
     * @param {PixelHierarchy} hierarchy - Hierarchy structure
     * @param {Number} mask - Layer mask
     * @param {Number[]} effects - Layer effects
     */
    constructor(width, height, type, name, properties, hierarchy, mask, effects) {
        this.width = width;
        this.height = height;
        this.type = type;
        this.name = name;
        this.properties = properties;
        this.hierarchy = hierarchy;
        this.mask = mask;
        this.effects = effects;
    }

    /**
     * Read layer from bytes
     * @param {Reader} reader - Reader seeked to beginning of layer
     * @param {Number} version - XCF version for pointers
     * @returns {Layer} - Parsed layer
     */
    static async from_bytes(reader, version) {
        const width = reader.getUint32AndAdvance();
        const height = reader.getUint32AndAdvance();
        const type = reader.getUint32AndAdvance();
        const name = reader.getString();

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

        let hptr;
        let mptr;
        if (version < 11) {
            hptr = reader.getUint32AndAdvance();
            mptr = reader.getUint32AndAdvance();
        } else {
            hptr = reader.getUint64AndAdvance();
            mptr = reader.getUint64AndAdvance();
        }

        const cur_pos = reader.relToStart(reader.cursor);
        reader.seek(hptr);
        const hierarchy = await PixelHierarchy.from_bytes(reader, version);
        reader.seek(cur_pos);

        let effects = [];
        while (true) {
            let pointer;
            if (version < 11) {
                pointer = reader.getUint32AndAdvance();
            } else {
                pointer = reader.getUint64AndAdvance();
            }

            if (pointer === 0) {
                break;
            }

            effects.push(pointer);
        }

        return new this(width, height, type, name, properties, hierarchy, mptr, effects);
    }
}

class Property {
    /**
     * Specific property type
     * @type {Number}
     */
    type;

    /** 
     * Specific property data
     * @type {Object}
     */
    data;

    /**
     * Underlying data
     * @type {ArrayBuffer}
     */
    bytes;

    /**
     * @param {Number} type - Specific property type
     * @param {ArrayBuffer} bytes - Underlying data
     * @param {Object} data - Specific property data
     */
    constructor(type, bytes, data) {
        this.type = type;
        this.bytes = bytes;
        this.data = data;
    }

    /**
     * @param {Number} type - Specific property type
     * @param {ArrayBuffer} bytes - Underlying data
     */
    static async from_bytes(type, bytes) {
        switch (type) {
            case 17: // PROP_COMPRESSION
                return new this(type, bytes, { compression: (new DataView(bytes)).getUint8() });
            default:
                return new this(type, bytes, {});
        }
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
     * Convert cursor-relative offset to absolute
     * @param {Number} offset - Cursor-relative offset
     */
    relToStart(offset) {
        return offset + this.r.byteOffset;
    }

    /**
     * Move to byte from beginning of data
     * @param {Number} offset - Offset to move to
     */
    seek(offset) {
        this.cursor = offset - this.r.byteOffset;
    }

    /**
     * Get a uint8 and advance 1 byte
     * @returns {Number} Parsed uint8
     */
    getUint8AndAdvance() {
        this.cursor += 1;
        return this.r.getUint8(this.cursor - 1);
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
     * Get a uint64 and advance 8 bytes
     * @returns {Number} Parsed uint64
     */
    getUint64AndAdvance() {
        this.cursor += 8;
        return Number(this.r.getBigUint64(this.cursor - 8));
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

    /**
     * Get a string
     * @returns {string} Returned string
     */
    getString() {
        const length = this.getUint32AndAdvance();
        const data = this.getArbitraryBytesAsBufferAndAdvance(length);
        return new TextDecoder().decode(data.slice(0, -1));
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
     * @type {Property[]}
     */
    properties;

    /**
     * Layers
     * @type {Layer[]}
     */
    layers;

    /**
     * @param {Number} version - XCF file version
     * @param {Number} width - Canvas width
     * @param {Number} height - Canvas height
     * @param {Number} color_mode - Image color mode
     * @param {Number} precision - Image precision
     * @param {Property[]} properties - Image properties
     * @param {Layer[]} layers - Layers
     */
    constructor(version, width, height, color_mode, precision, properties, layers) {
        this.version = version;
        this.width = width;
        this.height = height;
        this.color_mode = color_mode;
        this.precision = precision;
        this.properties = properties;
        this.layers = layers;
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
            properties.push(await Property.from_bytes(type, data));
        };

        const compression_prop = properties.filter((x) => { return x.type === 17; })[0];
        const compression_type = compression_prop.data.compression;

        let layers = [];
        while (true) {
            let pointer;
            if (version < 11) {
                pointer = reader.getUint32AndAdvance();
            } else {
                pointer = reader.getUint64AndAdvance();
            }

            if (pointer === 0) {
                break;
            }

            const cur_pos = reader.relToStart(reader.cursor);
            reader.seek(pointer);
            const layer = await Layer.from_bytes(reader, version);
            reader.seek(cur_pos);

            layer.hierarchy.level.tilePtrs = [];
            for (const tilePtr of layer.hierarchy.level.tilePtrs) {
                reader.seek(tilePtr);
                const tile = await Tile.from_bytes(reader, compression_type, layer.hierarchy.bpp);
                reader.seek(cur_pos);

                layer.hierarchy.level.tilePtrs.push(tile);
            }

            layers.push(layer);
        }

        return new this(version, width, height, color_mode, precision, properties, layers);
    };
}

export default XCF;