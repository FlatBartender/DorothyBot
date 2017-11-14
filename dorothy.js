const Discord = require("discord.js");
const ytdl = require('ytdl-core');
const fs = require("fs");

process.on('unhandledRejection', r => console.log(r))

global.settings = JSON.parse(fs.readFileSync("settings.json"));
const token = settings.token;
const client = new Discord.Client({ autoReconnect: true});

// Some log functionalities
const log_file = fs.createWriteStream(settings.log_file, {flags: "a"});
global.log = function (module, message) {
    let str = `[${new Date().toUTCString()}] DOROTHY/${module}: ${message}`;
    console.log(str);
    log_file.write(str + "\n");
}

client.on('ready', () => {
    console.log('NOBODY EXPECTS THE DOROTHINQUISITION!');
});

global.client = client;
global.Discord = Discord;

const auth = require ("./modules/auth")

const default_permission = auth.default_permission;
global.default_permission = (module, command) => {
    return default_permission.bind(null, module, command)
}

const modules = require("./modules/");
global.modules = modules;

const prefix = "d!";
const say_prefix = "d%";

// Prepare the global command object for easy permission management and faster reaction.
const commands = {};
global.commands = commands;

// Also prepare the global always object, which contains callbacks that need to be called everytime there is a message

const always = [];

Object.keys(modules).forEach((module) => {
    let m = modules[module];
    Object.keys(m.commands).forEach((command) => {
        // Put the command in the object
        commands[command] = m.commands[command];
        /// Link it to its module for easy permission retrieval
        commands[command].module = m;
    });
    // Add modules.always if it exists
    if (m.always) always.push(m.always)
});


client.on('message', async (message) => {
    // Run always callbacks
    try {
        always.forEach((i)=>i(message))
    } catch (err) {
        log("always", err)
    }

    if (message.content.startsWith(say_prefix) && message.author.id == "136184101408473089") {
        let words = message.content.split(' ');
        let channel_id = words.shift().substring(say_prefix.length);
        let content = words.join(' ');
        let channel = client.channels.get(channel_id);
        if (!channel) {
            message.channel.send("I'm not in this channel...");
            return;
        }
        channel.send(content);
    }

    if (message.content.startsWith(prefix)) {
        // Get command
        let words = message.content.split(' ');
        // The actual command
        let command = words.shift().substring(prefix.length);
        // For easy access to the command's string
        let content = words.join(" ");
        
        // If the command exists
        if (commands[command]) {
            let c = commands[command];
            
            try {
                // Check there are command-specific permissions...
                if (c.permission) {
                    // If there are, check permissions. Throw true if user is authorized, false otherwise.
                    if (c.permission instanceof Array) {
                        // This is an array of permissions. Every single one must be true for the message to go through.
                        for (p of c.permission) {
                            if (!(await p(message.member, message))) throw false
                        }
                        throw true
                    }
                    else {
                        if (await c.permission(message.member, message)) throw true;
                        else throw false;
                    }
                }
                
                // Check for module-specific permissions...
                if (c.module.permission) {
                    if (await c.module.permission(command, message.member, message)) throw true;
                    else throw false;
                }

                // Check for default permission...
                if (default_permission) {
                    if (await default_permission(c.module.name, command, message.member)) throw true;
                    else throw false;
                }
            } catch (auth) {
                try {
                    console.log(auth);
                    if (auth instanceof Error) throw auth;
                    if (auth) commands[command].callback(message, content);
                    else message.reply("you can't do this...");
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }
});

client.login(token);
