const Discord = require("discord.js");
const ytdl = require('ytdl-core');

const token = '***REMOVED***';

const client = new Discord.Client({ autoReconnect: true});

client.on('ready', () => {
    console.log('NOBODY EXPECTS THE DOROTHINQUISITION!');
});

const queues = {};

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
            return;
        }
        
        let connection = client.voiceConnections.find('channel', channel);
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

        try {
            ytdl.getInfo(content).then((infos) => {
                message.channel.send(`Queued ${infos.title}`);
                if (queues[connection] === undefined) queues[connection] = [];
                queues[connection].push({url: content, infos: infos});
                if (connection.speaking === false) {
                    playNext(message, connection);
                }
            }).catch( (err) => {
                console.log(`Error playing song: ${err}`);
                message.channel.send("I can't play this...");
            });
        } catch (err) {
            console.log(`Error playing song: ${err}`);
            message.channel.send("I can't play this...");
        }
    },
    "skip": function (message) {
        if (!message.guild) return;

        let connection = client.voiceConnections.find("channel", message.member.voiceChannel);
        if (!connection) {
            message.channel.send("You can't skip if you're not listening!");
            return;
        }
        
        if (!connection.dispatcher) {
            message.channel.send("But I'm not playing anything...");
            return;
        }
        
        if (connection.dispatcher) connection.dispatcher.end();
    }
};

function playNext(message, connection) {
    let queue = queues[connection];
    if (!queue) {
        //Queue is empty.
        message.channel.send("I have nothing to play.");
        return;
    }

    if (queue.length === 0) {
        //Queue is empty.
        message.channel.send("I have nothing left to play...");
        return;
    }
    
    if (connection.dispatcher) {
        connection.dispatcher.end();
        connection.dispatcher = null;
        return;
    }

    let song = queue.shift();
    message.channel.send(`Now playing ${song.infos.title}`);
    let stream = ytdl(song.url, { filter: 'audioonly' });
    let dispatcher = connection.playStream(stream, { seek: 0 });
    dispatcher.once('end', () => {
        connection.dispatcher = null;
        playNext(message, connection);
    });
}

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
