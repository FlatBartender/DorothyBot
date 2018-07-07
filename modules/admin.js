exports.commands = {
    "eval": {
        description: "P-please take care of me, s-senpai...",
        callback: function (message, content) {
            try {
                message.channel.send(eval(content).toString())
            } catch (err) {
                message.channel.send(err.toString())
            }
        }
    },
}

exports.name = "admin"
exports.description = "Module providing Dorothy admin tools. Don't make her overflow her buffers !"

// Only admins can use this module.
exports.permission = function(message, member, module, command) {
    return settings.auth.whitelist.includes(member.id)
}
