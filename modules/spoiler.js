const request = require('request-promise-native');

let client = global.client;


exports.commands = {
    "spoiler": {
        description: "I'll remove the message and leave a link to it instead !",
        callback: async function (message, content) {
            // Upload content to spoiler host
            try {
                let response = await request({
                    method: 'POST',
                    uri:    global.settings.spoilers.api_host,
                    headers: {
                        'Access-Token': global.settings.spoilers.api_key,
                    }, 
                    body: {
                        message: content
                    },
                    json: true
                })
                message.channel.send(`${(message.member && message.member.nickname) || message.author.username}: ${response.url}`)
            } catch (err) {
                log(err)
                message.channel.send("I can't upload the message to the server.")
                return
            }

            // Delete message
            message.delete().catch( err => message.channel.send("I can't delete this message... Please do it yourself !"))
        }
    },
}

exports.name = "spoilers";
exports.description = "Provide spoiler functions !";

let log = global.log.bind(exports, exports.name)

// Anyone can use this module.
exports.permission = function () {
    return true;
}

