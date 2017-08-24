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
            if (!message.member.voiceChannel) {
                message.channel.send("You're not even in a channel...");
                return;
            }
            let connection = client.voiceConnections.find("channel", message.member.voiceChannel);
            if (connection) {
                connection.disconnect();
                message.channel.send("I'm leaaaviiiing! Bye!");
                delete queues[connection];
                return;
            } else {
                message.channel.send("I can't leave a channel I'm not in...");
            }
        }
    },
    "request": {
        id: 3,
        description: "Request a song! Youtube links only, I need to get an upgrade.",
        callback: function (message, content) {
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
        }
    },
    "skip": {
        id: 4,
        description: "I'll skip the song I'm currently playing.",
        callback: function (message) {
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
    },
    "resume": {
        id: 5,
        description: "I'll resume playing if the song was paused!",
        callback: function (message) {
            if (!message.guild) return;
    
            let connection = client.voiceConnections.find("channel", message.member.voiceChannel);
            if (!connection) {
                message.channel.send("You can't play if you're not listening!");
                return;
            }
            
            if (!connection.dispatcher) {
                message.channel.send("But I'm not playing anything...");
                return;
            }
    
            connection.dispatcher.resume();
            message.channel.send("Music resumed!");
        }
    },
    "pause": {
        id: 6,
        description: "I'll pause the song I'm playing!",
        callback: function (message) {
            if (!message.guild) return;
    
            let connection = client.voiceConnections.find("channel", message.member.voiceChannel);
            if (!connection) {
                message.channel.send("You can't play if you're not listening!");
                return;
            }
            
            if (!connection.dispatcher) {
                message.channel.send("But I'm not playing anything...");
                return;
            }
    
            connection.dispatcher.pause();
            message.channel.send("Music paused!");
        }
    }
};
exports.name = "music";

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
