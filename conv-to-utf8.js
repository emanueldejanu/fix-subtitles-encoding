#!/usr/bin/env node
const fs = require('fs/promises');
const existsSync = require('fs').existsSync;
const path = require('path');
const iconvlite = require('iconv-lite');
const languageEncodingCB = require("detect-file-encoding-and-language");
const yargs = require('yargs/yargs');
const valid_extensions = [ '.srt', '.sub', '.smi' ];

function languageEncoding(filename) {
    return new Promise((resolve, reject) => {
        languageEncodingCB(filename)
            .then((fileInfo) => resolve(fileInfo));
    });
}

function shouldProcess(filename) {
    if (filename.startsWith('SYNOVIDEO_')) {
        return false;
    }
    const extname = path.extname(filename).toLowerCase();
    if (!valid_extensions.includes(extname)) {
        return false;
    }
    return !filename.endsWith('.forced' + extname );
}

function shouldConvert(encInfo) {
    return encInfo.encoding !== 'UTF-8' && encInfo.language === 'romanian';
}

async function convertFile(fromFile, toFile) {
    const encInfo = await languageEncoding(fromFile);
    const encoding = encInfo.encoding.toLowerCase();
    if (shouldConvert(encInfo)) {
        console.log(`convert file ${fromFile} from ${encInfo.encoding} (${encInfo.confidence.encoding}) to UTF-8 (language: ${encInfo.language} - ${encInfo.confidence.language})`);
        const content = await fs.readFile(fromFile);
        const decoded = iconvlite.decode(content, encoding)
        await fs.writeFile(toFile, decoded, 'utf8');
    } else {
        console.log(`skip file ${fromFile} with ${encInfo.encoding} (${encInfo.confidence.encoding}) and language: ${encInfo.language} (${encInfo.confidence.language})`);
    }
}

async function convertDirectory(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
       if (entry.isDirectory()) {
           await convertDirectory(path.join(dirPath, entry.name));
       } else if (entry.isFile() && shouldProcess(entry.name)) {
           const parts  = path.parse(entry.name);
           let newName = parts.name;
           if (!parts.name.endsWith('.ro')) {
               newName += '.ro';
           }
           newName += '.forced' + parts.ext;
           const newPath = path.join(dirPath, newName);
           if (!existsSync(newPath)) {
               await convertFile(path.join(dirPath, entry.name), newPath);
           }
       }
    }
}

const argv = yargs(process.argv.slice(2))
    .alias('p', 'path')
    .nargs('p', 1)
    .describe('p', 'Path to process')
    .demandOption(['p'])
    .help()
    .alias('help', 'h').argv;

const start = async () => {
    await convertDirectory(path.normalize(argv.path));
};

start().catch(err => console.error(err));
