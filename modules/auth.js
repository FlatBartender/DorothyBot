const ytdl = require('ytdl-core');
const Discord = require("discord.js");
const MongoClient = require("mongodb").MongoClient;
const assert = require("assert");

let db;

MongoClient.connect(global.settings.mongo_url, function (err, connection) {
    assert.equal(null, err);
    db = connection;
});

exports.commands = {
    "grant": {
        description: "I'll grant permissions to a user! Usage: grant <module>[.<command>] @<user> [@<user>...]",
        callback: function (message, content) {
            let args = content.split(" ");
            let perm = args.shift().split(".");
            if (message.mentions.members === undefined || perm === undefined || perm.length === 0 || perm.length > 2) {
                message.channel.send("You're using it wrong! It's `<module> @<user> [@user, ...]` or `<module>.<command> @<user> [@user, ...]`!");
                return;
            }
            if (!message.guild) return;
            
            let module_name = perm[0];
            let command_name = perm[1];
            if (global.modules[module_name] === undefined) {
                message.channel.send("I can't find this module...");
                return;
            }
            
            let permission = {};
            permission[module_name + command_name] = true;
            let c = db.collection(message.guild.id);
            message.mentions.members.forEach(async (member) => {
                if (! await c.findOne({"_id": member.id})) {
                    c.insertOne({"_id": member.id});
                }
                c.updateOne({"_id": member.id}, { $set: permission });
            });
            message.channel.send(`I successfully granted them permissions on ${module_name + (command_name ? ("." + command_name) : "")}!`);
        }
    },
    "revoke": {
        description: "I'll remove these permissions from a user! Usage: revoke <module>[.<command>] @<user> [@<user>...]",
        callback: function (message, content) {
            let args = content.split(" ");
            let perm = args.shift().split(".");
            if (message.mentions.members === undefined || perm === undefined || perm.length === 0 || perm.length > 2) {
                message.channel.send("You're using it wrong! It's `<module> @<user> [@user, ...]` or `<module>.<command> @<user> [@user, ...]`!");
                return;
            }
            if (!message.guild) return;
            
            let module_name = perm[0];
            let command_name = perm[1];
            
            let permission = {};
            permission[module_name + command_name] = false;
             let c = db.collection(message.guild.id);
            message.mentions.members.forEach(async (member) => {
                if (! await c.findOne({"_id": member.id})) {
                    c.insertOne({"_id": member.id});
                }
                c.updateOne({"_id": member.id}, { $set: permission });
            });
            message.channel.send(`I successfully revoked their permissions on ${module_name + (command_name ? ("." + command_name) : "")}!`);

        }
    }
};
exports.name = "auth";
exports.description = "Module providing permissions. Can only be used by users with the manage server permission.";

exports.default_permission = async function default_permission(message, member, module, command) {
    if (member.guild === undefined) return false;
    let user = await db.collection(member.guild.id).findOne({"_id": member.id});
    if (!user) return false;
    return user[global.modules[module].name] || user[global.modules[module] + global.commands[command]];
};

// Only admins can use this module.
exports.permission = function (message, member, module, command) {
    if (settings.auth.whitelist.includes(member.id)) return true
    if (member.hasPermission === undefined) return false
    return member.hasPermission(Discord.Permissions.FLAGS.MANAGE_GUILD)
};

