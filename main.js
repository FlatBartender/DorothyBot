const Discord = require("discord.js");
const ytdl = require('ytdl-core');

const token = '***REMOVED***';

const client = new Discord.Client();

client.on('ready', () => {
    console.log('NOBODY EXPECTS THE DOROTHINQUISITION!');
});


const prefix = "d!";
const commands = {
    "ping": function (message) {
        message.reply("pong");
    },
    "voice": function (message) {
        if (!message.guild) return;

        let channel = message.member.voiceChannel;
        if (!channel) {
            message.reply("You're not in a voice channel!");
        }
        
        let connection = client.voiceConnections.find('channel', message.member.voiceChannel);
        if (connection) {
            message.reply("I'm already in this voice channel!");
            return;
        }
        
        channel.join().then((connection) => {
            message.reply("I have successfully connected to the voice channel and am ready to play some music!");
        });
    },
    "leave": function (message) {
        if (!message.guild) return;

        let connection = client.voiceConnections.find("channel", message.member.voiceChannel);
        if (connection) {
            connection.disconnect();
            message.channel.send("I'm leaaaviiiing! Bye!");
            return;
        } else {
            message.channel.send("I can't leave a channel I'm not in...");
        }
    },
    "request": function (message, content) {
        if (!message.guild) return;

        let connection = client.voiceConnections.find("channel", message.member.voiceChannel);
        if (!connection) {
            message.channel.send("I can't play anything if I'm not in a channel...");
            return;
        }

        let dispatcher;
        if (message.content.includes("youtu.be") || message.content.includes("www.youtube.com")) {
            // It's a youtube video, play it
            let stream = ytdl(content, { filter: 'audioonly' });
            dispatcher = connection.playStream(stream);
        } else {
            // It's something else, play it as a file
            dispatcher = connection.playFile(content);
        }
    },
};

client.on('message', message => {
    if (message.content.startsWith(prefix)) {
        // Get command
        let words = message.content.split(' ');
        let command = words.shift().substring(prefix.length);
        let content = words.join(" ");
        if (commands[command]) commands[command](message, content);
    }
});

client.login(token);
