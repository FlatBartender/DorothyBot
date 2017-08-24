const Discord = require("discord.js");
const ytdl = require('ytdl-core');
const fs = require("fs");

global.settings = JSON.parse(fs.readFileSync("settings.json"));
const token = settings.token;
const client = new Discord.Client({ autoReconnect: true});

client.on('ready', () => {
    console.log('NOBODY EXPECTS THE DOROTHINQUISITION!');
});

global.client = client;

const modules = require("./modules/");
global.modules = modules;

const prefix = "d!";

// Prepare the global command object for easy permission management and faster reaction.
const commands = {}
global.commands = commands;

Object.keys(modules).forEach((module) => {
    let m = modules[module];
    Object.keys(m.commands).forEach((command) => {
        // Put the command in the object
        commands[command] = m.commands[command];
        /// Link it to its module for easy permission retrieval
        commands[command].module = m;
    });
});

const default_permission = modules.auth.default_permission;

client.on('message', async (message) => {
    if (message.content.startsWith(prefix)) {
        // Get command
        let words = message.content.split(' ');
        // The actual command
        let command = words.shift().substring(prefix.length);
        // For easy acces to the command's string
        let content = words.join(" ");
        
        // If the command exists
        if (commands[command]) {
            let c = commands[command];
            
            try {
                // Check there are command-specific permissions...
                if (c.permission) {
                    // If there are, check permissions. Throw true if user is authorized, false otherwise.
                    if (c.permission(message.member)) throw true;
                    else throw false;
                }
                
                // Check for module-specific permissions...
                if (c.module.permission) {
                    if (c.module.permission(command, message.member)) throw true;
                    else throw false;
                }

                // Check for default permission...
                if (default_permission) {
                    let perm;
                    try {
                        perm = await default_permission(c.module.name, command, message.member);
                    } catch (err) {
                        console.log(err);
                    }
                    if (perm) throw true;
                    else throw false;
                }
            } catch (auth) {
                try {
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
