exports.id = 12000;
exports.commands = {
    "eval": {
        id: 1,
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
exports.permission = function (command, member) {
    if (member.hasPermission === undefined) return false
    return member.hasPermission(Discord.Permissions.FLAGS.MANAGE_GUILD)
}
