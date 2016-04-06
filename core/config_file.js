'use strict';
const fs = require('fs');

module.exports = (filename) => {
    const result = {};
    result.data = {};
    result.load = () => {
        return new Promise((resolve, reject) => {
            fs.readFile(filename, (readError, data) => {
                if (readError) {
                    return reject(readError);
                }
                try {
                    result.data = JSON.parse(data);
                } catch (err) {
                    return reject(err);
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
            fs.writeFile(filename, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });
    };
    return result.load();
};