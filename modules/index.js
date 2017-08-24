const fs = require("fs");
const path = require("path");

modules = [];

fs.readdirSync(__dirname).forEach(function(file) {
    if (file.startsWith(".") || !(path.extname(file) === ".js" )|| file === "index.js"){
        // Ignore hidden or non-js files or this file
        return;
    }
    modules.push(require("./" + file));
});

module.exports = modules;
