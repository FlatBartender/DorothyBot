const TwitchWebhook = require("twitch-webhook")
const https = require("https")
const assert = require("assert")

const twitch_client_id = global.settings.twitch_id

const twitchWebhook = new TwitchWebhook({
    client_id: twitch_client_id,
    callback: 'http://alice.gensokyo.eu/twitch',
    secret: 'ps4sjhh4b1wk6z74qzl38oa35h3q0q'
})

// renew the subscription when it expires
twitchWebhook.on('unsubscribe', (obj) => { 
    twitchWebhook.subscribe(obj['hub.topic'])
})

process.on('exit', () => {
    // unsubscribe from all topics
    twitchWebhook.unsubscribe('*')
})

let cache = {}

let twitch_db = global.db.collection("twitch_module")

twitch_db.find().toArray( (err, items) => {
    assert.equal(null, err)

    items.forEach( (guild) => {
        cache[guild._id] = guild
        cache[guild._id].announce_channel = global.client.channels.get(guild.announce_channel)
        if (!cache[guild._id].announce_channel) {
            return
        }
        guild.streamers.forEach( (streamer) => {
            twitchWebhook.subscribe("streams", {
                user_id: streamer
            })
        })
    })
})

exports.id = 11000
exports.commands = {
    "twsetannounce": {
        id: 1,
        description: "Set the channel where lives will be announced",
        callback: async function (message) {
            await twitch_db.save({"_id": message.guild.id}, {"announce_channel": message.channel.id})
            if (!cache[message.guild.id]) cache[message.guild.id] = {}
            cache[message.guild.id].announce_channel = message.channel
            message.channel.send("Channel successfully set as announce channel !")
        }
    },
    "twadd": {
        id: 2,
        description: "Notify when this streamer goes live",
        callback: async function (message) {
            let streamer = message.split(" ").shift()
            if (streamer == "") {
                message.channel.send("You need to specify a streamer's name !")
                return
            }
            let data = await get_users_by_name([streamer])
            if (data.length == 0) {
                message.channel.send("I can't find this streamer...")
                return
            }
            let streamer_id = data[0].id

            await twitch_db.save({"_id": message.guild.id}, { $push: {"streamers": streamer_id}})
            if (cache[message.guild.id].streamers) cache[message.guild.id].streamers.push(streamer_id)
            else cache[message.guild.id].streamers = [streamer_id]
            
            // Subscribe to channel
            twitchWebhook.subscribe("streams", {
                user_id: streamer_id
            })

            message.channel.send(`I'm successfully monitoring ${streamer}'s channel !`)
        }
    },
    "twdel": {
        id: 3,
        description: "Stop notifying when this streamer goes live",
        callback: async function (message) {
            let streamer = message.split(" ").shift()
            if (streamer == "") {
                message.channel.send("You need to specify a streamer's name !")
                return
            }
            let data = await get_users_by_name([streamer])
            if (data.length == 0) {
                message.channel.send("I can't find this streamer...")
                return
            }
            let streamer_id = data[0].id

            await twitch_db.save({"_id": message.guild.id}, { $push: {"streamers": streamer_id}})
            if (cache[message.guild.id].streamers) cache[message.guild.id].streamers = cache[message.guild.id].streamers.filter((streamer) => streamer != streamer_id)
            else cache[message.guild.id].streamers = null
            
            // Subscribe to channel
            twitchWebhook.unsubscribe("streams", {
                user_id: streamer_id
            })

            message.channel.send(`I've successfully stopped monitoring ${streamer}'s channel !`)
        }
    }
}


exports.permission = [global.permissions.module.guild_only, global.default_permission.bind(null, exports.name)]

exports.name = "twitch"
exports.description = "Provides Twitch integration (live notifications)"

function get_users_by_name(usernames) {
    return new Promise ( (resolve, reject) => {
        var data = ""
        https.request({
            hostname: "api.twitch.tv",
            path: "/helix/users?login=" + usernames.join("&login="),
            headers: {
                "Client-Id": twitch_client_id
            }
        }, (res) => {
            res.on("data", (chunk) => data += chunk)
            res.on("end", () => resolve(JSON.parse(data)))
        }).on("error", (err) => reject(err))
    })
}
