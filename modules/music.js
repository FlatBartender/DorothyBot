const ytdl = require('ytdl-core');
const request = require('request');
const {google} = require('googleapis');
google.options({auth: settings.google_api_key})
const youtube = google.youtube('v3');
const URL = require('url').URL;

const queues = {};

let client = global.client;

exports.commands = {
    "voice": {
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
                queues[channel.guild.id] = {dispatcher: null, queue: []};
            });
        }
    },
    "leave": {
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
                delete queues[channel.guild.id];
                connection.disconnect();
                message.channel.send("I'm leaaaviiiing! Bye!");
                return;
            } else {
                message.channel.send("I can't leave a channel I'm not in...");
            }
        }
    },
    "queue": {
        description: "I'll show the queued songs!",
        callback: async function (message) {
            if (!message.guild) return;
            let channel = message.member.voiceChannel;
            if (!channel) {
                message.channel.send("Only listeners can ask for the queue.");
                return;
            }
            let connection = client.voiceConnections.find("channel", channel);
            if (!connection) {
                message.channel.send("I'm not even broadcasting anything in your channel...");
                return;
            }
            
            let lines = []
            let queue = queues[channel.guild.id]
            if (queue.playing) {
                lines.push(`Now playing: ${queue.playing.infos.title || queue.playing.url} ${queue.paused ? "(paused)" : ""}`)
            }
            queue.queue.forEach( (song, index) => {
                lines.push(`${("     "+(index+1)).slice(-5)}: ${song.infos.title || song.url}`)
            })

            // Nothing playing, nothing in queue
            if (lines.length === 0) lines.push("The queue is empty.")
            message.channel.send("```\n" + lines.join("\n") + "```")
        }
    },
    "request": {
        description: "Request a song! Enter either an URL or some keywords to search with on youtube.",
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
                let results = (await youtube.search.list({part: "snippet", type: "video", q: content})).data
                let song;
                let infos = {};
                if (!results.items || results.items.length === 0) {
                    // Youtube video not found, check if the url is valid then queue it
                    new URL(content);   // This throws a TypeError if there's a problem
                    song = content;     // Might only need song = new URL(content) ? idk how URL handles string conversion
                } else {
                    // Youtube video found, queue it with the id and let youtube-dl download it
                    let video = results.items[0];
                    infos = {title: video.snippet.title};
                    song = video.id.videoId; 
                }
                message.channel.send(`Queued ${infos.title ? infos.title : song}`);
                queues[channel.guild.id].queue.push({url: song, infos: infos});
                if (!queues[channel.guild.id].dispatcher) {
                    playNext(message, connection);
                }
            } catch (err) {
                console.log(err);
            }
        }
    },
    "skip": {
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
            
            if (!queues[channel.guild.id].dispatcher) {
                message.channel.send("But I'm not playing anything...");
                return;
            }
            
            queues[channel.guild.id].dispatcher.end();
        }
    },
    "resume": {
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
            
            if (!queues[channel.guild.id].dispatcher) {
                message.channel.send("But I'm not playing anything...");
                return;
            }
    
            queues[channel.guild.id].dispatcher.resume();
            delete queues[channel.guild.id].paused
            message.channel.send("Music resumed!");
        }
    },
    "pause": {
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
            
            if (!queues[channel.guild.id].dispatcher) {
                message.channel.send("But I'm not playing anything...");
                return;
            }
    
            queues[channel.guild.id].dispatcher.pause();
            queues[channel.guild.id].paused = true;
            message.channel.send("Music paused!");
        }
    }
};
exports.name = "music";
exports.description = "To play music in a voice channel!";

function playNext(message, connection) {
    let q = queues[message.guild.id];
    if (!q) return
    delete q.playing
    delete q.paused
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
    message.channel.send(`Now playing ${song.infos.title || song.url}`);
    let stream;
    if (song.infos.title) {
        stream = ytdl(song.url, { filter: 'audioonly' });
    } else {
        stream = request(song.url);
    }
    q.dispatcher = connection.playStream(stream, {seek: 0, volume: 0.3, bitrate: "auto"});
    q.dispatcher.once('end', (reason) => {
        console.log("Stream ended with reason: ", reason);
        if (q) {
            delete q.dispatcher;
            playNext(message, connection);
        }
    });
    q.dispatcher.on("error", (err) => {
        console.log(err);
    });
}
