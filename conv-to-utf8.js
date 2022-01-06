#!/usr/bin/env node
const fs = require('fs/promises');
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
    const extname = path.extname(filename).toLowerCase();
    if (!valid_extensions.includes(extname)) {
        return false;
    }
    return !filename.endsWith('.forced' + extname );
}

async function convert_file(fromFile, toFile) {
    console.log('file', fromFile);
    const encInfo = await languageEncoding(fromFile);
    console.log(encInfo);
    const encoding = encInfo.encoding.toLowerCase();
    if (encoding !== 'utf-8') {
        console.log('Reading file as ', encoding);
        const content = await fs.readFile(fromFile);
        const decoded = iconvlite.decode(content, encoding)
        await fs.writeFile(toFile, decoded, 'utf8');
    }
}

async function convert_directory(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
       if (entry.isDirectory()) {
           await convert_directory(path.join(dirPath, entry.name));
       } else if (entry.isFile() && shouldProcess(entry.name)) {
           const parts  = path.parse(entry.name);
           let newName = parts.name;
           if (!parts.name.endsWith('.ro')) {
               newName += '.ro';
           }
           newName += '.forced' + parts.ext;
           await convert_file(path.join(dirPath, entry.name), path.join(dirPath, newName));
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
    await convert_directory(path.normalize(argv.path));
};

start().catch(err => console.error(err));
