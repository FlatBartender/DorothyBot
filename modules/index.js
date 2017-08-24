const fs = require("fs");
const path = require("path");


fs.readdirSync(__dirname).forEach(function(file) {
    if (file.startsWith(".") || !(path.extname(file) === ".js" )|| file === "index.js"){
        // Ignore hidden or non-js files or this file
        return;
    }
    let module = require("./" + file);
    exports[module.name] = module;
});

