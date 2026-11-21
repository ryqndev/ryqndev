// @ts-nocheck

const sharp = require('sharp');
const fs = require('fs');

const compress = () => {
    const testFolder = 'shaws/';

    fs.readdir(testFolder, (_, files) => {
        files.forEach((file) => {
            console.log(file);
            sharp(`shaws/${file}`).jpeg({ quality: 25 }).toFile(`shaws-compressed/${file}`);
        });
    });
}

compress();