const Discord = require("discord.js");
const ytdl = require('ytdl-core');
const fs = require("fs");

const settings = JSON.parse(fs.readFileSync("settings.json"));
const token = settings.token;

const client = new Discord.Client({ autoReconnect: true});

client.on('ready', () => {
    console.log('NOBODY EXPECTS THE DOROTHINQUISITION!');
});

const modules = require("./modules/");

const prefix = "d!";

// Prepare the global command object for easy permission management and faster reaction.
const commands = {};
modules.forEach((module) => {
    Object.keys(module.commands).forEach((command) => {
        // Put the command in the object
        commands[command] = module.commands[command];
        /// Link it to its module for easy permission retrieval
        commands[command].module = module;
    });
});

// TODO: have real permissions
function default_permission() {
    return true;
}

client.on('message', message => {
    if (message.content.startsWith(prefix)) {
        // Get command
        let words = message.content.split(' ');
        // The actual command
        let command = words.shift().substring(prefix.length);
        // For easy acces to the command's string
        let content = words.join(" ");

        // If the command exists
        if (commands[command]) {
            let command_object = commands[command];
            
            try {
                // Check there are command-specific permissions...
                if (command_object.permission) {
                    // If there are, check permissions. Throw true if user is authorised, false otherwise.
                    if (command_object.permission(message.member)) throw true;
                    else throw false;
                }
                
                // Check for module-specific permissions...
                if (command_object.module.permission) {
                    if (command_object.module.permission(message.member)) throw true;
                    else throw false;
                }

                // Check for default permission...
                if (default_permission) {
                    if (default_permission(message.member)) throw true;
                    else throw false;
                }
            } catch (auth) {
                if (auth) commands[command].callback(message, content);
                else message.reply("you can't do this...");
            }
        }
    }
});

client.login(token);
