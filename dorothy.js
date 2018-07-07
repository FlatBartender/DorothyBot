const Discord = require("discord.js");
const fs = require("fs");

process.on('unhandledRejection', r => console.log(r))

global.settings = JSON.parse(fs.readFileSync("settings.json"));

// Make sure settings are in the good format
if (!settings.auth) settings.auth = {}
if (!settings.auth.whitelist) settings.auth.whitelist = []

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

global.default_permission = auth.default_permission;

const modules_found = require("./modules/")
global.modules = {}

Object.keys(modules_found).forEach( (m_name) => {
    let m = modules_found[m_name]
    if ((settings.exclude &&
            (settings.exclude.includes(m.name) || 
             settings.exclude.includes(m.id))) ||
        (m.not_default &&
            (settings.include && 
                !(settings.include.includes(m.name) || 
                  settings.include.includes(m.id)))) ||
        (m.not_default && !settings.include)) {
        // Don't load the module if it's in the exclude list or it's not a default module AND it's not in the include lists
        log("global", `${m.name} won't be loaded`)
        return;
    }
    log("global", `Loading ${m.name}...`)
    global.modules[m_name] = m
})

const prefix = settings.prefix;
const say_prefix = settings.say_prefix;

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

function wrap(item) {
    if (item instanceof Array) return item
    else return [item]
}

function check_permissions(c, message, member, module, command) {
    // Check there are command-specific permissions...
    if (c.permission) {
        return Promise.all(wrap(c.permission).map( p => p(message, member, module, command) ))
    }

    // Check for module-specific permissions...
    if (c.module.permission) {
        return Promise.all(wrap(c.module.permission).map( p => p(message, member, module, command) ))
    }

    // Check for default permission...
    if (default_permission) {
        return Promise.all(wrap(default_permission).map( p => p(message, member, module, command) ))
    }

    return [true]
}

client.on('message', async (message) => {
    // Run always callbacks
    try {
        always.forEach((i)=>i(message))
    } catch (err) {
        log("always", err)
    }

    if (message.content.startsWith(say_prefix) && settings.auth.whitelist.includes(message.author.id)) {
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
        log("global", `${message.author.username} used: ${message.content}`)

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
                if ((await check_permissions(c, message, message.member, c.module.name, command)).every( r => r === true )) {
                    c.callback(message, content)
                } else {
                    message.reply("you can't do this...")
                }
            } catch (err) {
                log("global", err)
                if (err instanceof Error) {
                    log("global-debug", err.stack)
                }
            }
        } 
    }
});

client.login(token);
