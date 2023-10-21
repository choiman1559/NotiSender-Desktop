const {parseAESToken, getCombinedArray, compressString, decompressString} = require('./AESCrypto')
const crypto = require('crypto');

const encryptMac = (plain, TOKEN_KEY, hashKey) => {
    return new Promise((resolve) => {
        let iv = crypto.randomBytes(16);
        let cipherText;

        if(TOKEN_KEY !== null) {
            let cipher = crypto.createCipheriv('aes-256-cbc', parseAESToken(TOKEN_KEY), iv);
            cipherText = Buffer.concat([cipher.update(plain), cipher.final()]);
        } else {
            cipherText = Buffer.from(plain, 'utf8');
        }

        let hashCipher = crypto.createHmac('sha256', generateToken(hashKey))
        hashCipher.update(iv)
        hashCipher.update(cipherText)
        let hashText = hashCipher.digest();

        let ivAndHashText = getCombinedArray(iv, hashText);
        let finalByteArray = getCombinedArray(ivAndHashText, cipherText)
        resolve(Buffer.from(finalByteArray).toString('base64'));
    });
};

const decryptMac = (encoded, TOKEN_KEY, hashKey) => {
    return new Promise((resolve) => {
        let ivAndCipherText = Buffer.from(encoded, "base64")
        let iv = ivAndCipherText.subarray(0, 16);
        let hash = ivAndCipherText.subarray(16, 48);
        let cipherText = ivAndCipherText.subarray(48)

        let hashCipher = crypto.createHmac('sha256', generateToken(hashKey))
        hashCipher.update(iv)
        hashCipher.update(cipherText)
        let hashText = hashCipher.digest();

        if(!hashText.equals(Buffer.from(hash))) {
            throw new Error("Could not authenticate! Please check if data is modified by unknown attacker or sent from unpaired (or maybe itself?) device")
        }

        if(TOKEN_KEY === null) {
            let decrypted = Buffer.from(cipherText).toString()
            resolve(decrypted)
        } else {
            let decipher = crypto.createDecipheriv('aes-256-cbc', parseAESToken(TOKEN_KEY), iv);
            let decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
            resolve(decrypted.toString());
        }
    });
};

const encodeMac = async (plain, key, hashKey) => {
    return compressString(await encryptMac(plain, key, hashKey));
};

const decodeMac = async (plain, key, hashKey) => {
    return decryptMac(await decompressString(plain), key, hashKey);
};

function generateToken(string) {
    return (string + "S.F#5m:TC]baX08m7U/{kjtWjx}#5Wu2").substring(0, 32);
}

function generateTokenIdentifier(string1, string2) {
    let saltArray = ["md9kg?,UWeUvbZN/", "aev0.)EJ/fn#u0bn"]
    let finalString = "";

    if(string1.length >= string2.length) {
        finalString += (string1.substring(0, 8) + saltArray[0]).substring(0, 16);
        finalString += (string2.substring(0, 8) + saltArray[1]).substring(0, 16);
    } else {
        finalString += (string1.substring(0, 8) + saltArray[1]).substring(0, 16);
        finalString += (string2.substring(0, 8) + saltArray[0]).substring(0, 16);
    }

    return Buffer.from(finalString.substring(0, 32)).toString("base64");
}

module.exports = {
    encodeMac,
    decodeMac,
    generateTokenIdentifier
};