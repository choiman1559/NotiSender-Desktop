const crypto = require('crypto');
const zlib = require('zlib');

const compress = (text) => {
    return new Promise((resolve, reject) => {
        zlib.deflate(text, (err, buffer) => {
            if (!err) {
                resolve(buffer);
            } else {
                reject(err);
            }
        });
    });
};

const decompress = (buffer) => {
    return new Promise((resolve, reject) => {
        zlib.unzip(buffer, (err, buffer) => {
            if (!err) {
                resolve(buffer.toString());
            } else {
                reject(err);
            }
        });
    });
};

const byteToString = (buffer) => {
    let string = '';
    try {
        for (let b of buffer) {
            string += ('0' + (b & 0xFF).toString(16)).slice(-2);
        }
    } catch (e) {
        console.log(e);
        return null;
    }
    return string;
};

const hexToByteArray = (hex) => {
    if (hex == null || hex.length % 2 !== 0) {
        return new Uint8Array(0);
    }
    let bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[Math.floor(i / 2)] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
};

const compressString = async (string) => {
    return byteToString(await compress(string));
};

const decompressString = async (compressed) => {
    return decompress(hexToByteArray(compressed));
};

const getCombinedArray = (one, two) => {
    let combined = new Uint8Array(one.length + two.length);
    for (let i = 0; i < combined.length; ++i) {
        combined[i] = i < one.length ? one[i] : two[i - one.length];
    }
    return combined;
};

const parseAESToken = (string) => {
    if (string.length === 32) return string;
    string += "D~L*e/`/Q*a&h~e0jy$zU!sg?}X`CU*I";
    return string.substring(0, 32);
};

const encrypt = (plain, TOKEN_KEY) => {
    return new Promise((resolve) => {
        let iv = crypto.randomBytes(16);
        let cipher = crypto.createCipheriv('aes-256-cbc', parseAESToken(TOKEN_KEY), iv);
        let cipherText = Buffer.concat([cipher.update(plain), cipher.final()]);
        let ivAndCipherText = getCombinedArray(iv, cipherText);
        resolve(Buffer.from(ivAndCipherText).toString('base64'));
    });
};

const decrypt = (encoded, TOKEN_KEY) => {
    return new Promise((resolve) => {
        let ivAndCipherText = Buffer.from(encoded, 'base64');
        let iv = ivAndCipherText.slice(0, 16);
        let cipherText = ivAndCipherText.slice(16);
        let decipher = crypto.createDecipheriv('aes-256-cbc', parseAESToken(TOKEN_KEY), iv);
        let decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
        resolve(decrypted.toString());
    });
};

const encode = async (plain, key) => {
    return compressString(await encrypt(plain, key));
};

const decode = async (plain, key) => {
    return decrypt(await decompressString(plain), key);
};

function shaAndHex(plainText) {
    const hash = crypto.createHash('sha1');
    hash.update(plainText, 'utf8');
    return hash.digest('hex');
}

module.exports = {
    encode,
    decode,
    parseAESToken,
    getCombinedArray,
    compressString,
    decompressString,
    shaAndHex
};
