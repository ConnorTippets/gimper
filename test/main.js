import XCFConverter from "../src/main.js";
import { readFileSync } from "node:fs";

const bytes = readFileSync(process.argv[2] || "");

XCFConverter.to_png(bytes);