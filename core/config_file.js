'use strict';
const fs = require('fs');

module.exports = (filename) => {
    const result = {};
    result.data = {};
    result.exists = false;
    result.load = () => {
        return new Promise((resolve, reject) => {
            fs.readFile(filename, (readError, data) => {
                if (readError) {
                    if (readError.code === 'ENOENT') {
                        result.data = {};
                        result.exists = false;
                    } else {
                        return reject(readError);
                    }
                } else {
                    result.exists = true;
                    try {
                        result.data = JSON.parse(data);
                    } catch (err) {
                        return reject(err);
                    }
                }
                resolve(result);
            });
        });
    };
    result.save = () => {
        return new Promise((resolve, reject) => {
            let data;
            try {
                data = JSON.stringify(result.data, null, '  ');
            } catch (err) {
                return reject(err);
            }
            fs.writeFile(filename, data, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
                result.exists = true;
            });
        });
    };
    return result.load();
};