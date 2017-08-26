const ytdl = require('ytdl-core');

const queues = {};
exports.id = 1000;

let client = global.client;

exports.commands = {
    "voice": {
        id: 1,
        description: "I'll join the voice channel you're in!",
        callback: function (message) {
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
                queues[channel.id] = {dispatcher: null, queue: []};
            });
        }
    },
    "leave": {
        id: 2,
        description: "I'll leave your voice channel...",
        callback: function (message) {
            if (!message.guild) return;
            if (!client.voiceConnections) {
                message.channel.send("I'm not even in a channel...");
                return;
            }
            let channel = message.member.voiceChannel;
            if (!channel) {
                message.channel.send("You're not even in a channel...");
                return;
            }
            let connection = client.voiceConnections.find("channel", channel);
            if (connection) {
                connection.disconnect();
                message.channel.send("I'm leaaaviiiing! Bye!");
                delete queues[channel.id];
                return;
            } else {
                message.channel.send("I can't leave a channel I'm not in...");
            }
        }
    },
    "request": {
        id: 3,
        description: "Request a song! Youtube links only, I need to get an upgrade.",
        callback: async function (message, content) {
            if (!message.guild) return;
            let channel = message.member.voiceChannel;
            if (!channel) {
                message.channel.send("Start with joining the voice channel instead of requesting a song!");
                return;
            }
            let connection = client.voiceConnections.find("channel", channel);
            if (!connection) {
                message.channel.send("I can't play anything if I'm not in a channel...");
                return;
            }
    
            try {
                let infos = await ytdl.getInfo(content);
                message.channel.send(`Queued ${infos.title}`);
                queues[channel.id].queue.push({url: content, infos: infos});
                if (!queues[channel.id].dispatcher) {
                    playNext(message, connection);
                }
            } catch (err) {
                console.log(err);
                message.channel.send("I can't play this...");
            }
        }
    },
    "skip": {
        id: 4,
        description: "I'll skip the song I'm currently playing.",
        callback: function (message) {
            if (!message.guild) return;
            let channel = message.member.voiceChannel;
            if (!channel) {
                message.channel.send("Start with joining the voice channel instead of skipping a song!");
                return;
            }
            let connection = client.voiceConnections.find("channel", channel);
            if (!connection) {
                message.channel.send("You can't skip if you're not listening!");
                return;
            }
            
            if (!queues[channel.id].dispatcher) {
                message.channel.send("But I'm not playing anything...");
                return;
            }
            
            queues[channel.id].dispatcher.end();
        }
    },
    "resume": {
        id: 5,
        description: "I'll resume playing if the song was paused!",
        callback: function (message) {
            if (!message.guild) return;
            let channel = message.member.voiceChannel;
            if (!channel) {
                message.channel.send("Start with joining the voice channel instead of resuming the song!");
                return;
            }  
            let connection = client.voiceConnections.find("channel", channel);
            if (!connection) {
                message.channel.send("You can't resume if you're not listening!");
                return;
            }
            
            if (!queues[channel.id].dispatcher) {
                message.channel.send("But I'm not playing anything...");
                return;
            }
    
            queues[channel.id].dispatcher.resume();
            message.channel.send("Music resumed!");
        }
    },
    "pause": {
        id: 6,
        description: "I'll pause the song I'm playing!",
        callback: function (message) {
            if (!message.guild) return;
            let channel = message.member.voiceChannel;
            if (!channel) {
                message.channel.send("Start with joining the voice channel instead of pausing the song!");
                return;
            }  
            let connection = client.voiceConnections.find("channel", channel);
            if (!connection) {
                message.channel.send("You can't pause if you're not listening!");
                return;
            }
            
            if (!queues[channel.id].dispatcher) {
                message.channel.send("But I'm not playing anything...");
                return;
            }
    
            queues[channel.id].dispatcher.pause();
            message.channel.send("Music paused!");
        }
    }
};
exports.name = "music";
exports.description = "To play music in a voice channel!";

function playNext(message, connection) {
    let q = queues[message.member.voiceChannel.id];
    if (!q.queue) {
        //Queue is empty.
        message.channel.send("I have nothing to play.");
        return;
    }

    if (q.queue.length === 0) {
        //Queue is empty.
        message.channel.send("I have nothing left to play...");
        return;
    }
    
    let song = q.queue.shift();
    q.playing = song;
    message.channel.send(`Now playing ${song.infos.title}`);
    let stream = ytdl(song.url, { filter: 'audioonly' });
    q.dispatcher = connection.playStream(stream);
    q.dispatcher.once('end', (reason) => {
        console.log("Stream ended with reason: ", reason);
        playNext(message, connection);
    });
    q.dispatcher.on("error", (err) => {
        console.log(err);
    });
}
