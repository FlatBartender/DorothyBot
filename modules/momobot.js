const mongo = require("mongodb").MongoClient
const assert = require("assert")

let db
let momo_db

mongo.connect(global.settings.mongo_url, function (err, connection) {
    assert.equal(null, err)
    db = connection
    momo_db = db.collection("momobot")
})

// So we can just shift and push to add messages
let latest_messages = [0,0,0,0,0,0,0,0,0,0]

class User {
    constructor() {

    }

    async load(id) {
        let user = await momo_db.findOne({"_id": id})
        if (!user) {
            // User does not exist in DB. Create it.
            this._xp = 0
            this._id = id
            this.level = 1
            momo_db.insertOne({"_id": id, user: this})
        } else {
            // User exists, copy it (can't assign user.user to this)
            for (let prop in user.user) this[prop] = user.user[prop]
        }

    }

    set xp(xp) {
        this._xp = xp
        while (this._xp >= this.xp_to_next) {
            // level up
            this.level++
            this._xp -= this.xp_to_next
        }
        momo_db.updateOne({"_id": this._id}, { $set: {user: this}}) 
    }

    get xp() {
        return this._xp
    }

    get xp_to_next() {
        let xp = 100
        for (let lvl = 2; lvl < this.level; lvl++) {
            xp += lvl * 10
        }
        return xp
    }

    get total_exp() {
        if (this.level == 1) return this.xp
        let xp = 100
        for (let lvl = 2; lvl < this.level; lvl++) {
            xp += xp + lvl*10
        }
        return xp + this.xp
    }
}

class Momo {
    Momo(number) {
        this.number = number
        this.type = type
        this.xp = xp
        this.next = next
        this.power = power
        this.pet = new Pet()
        this.hp = hp
        this.hunger = hunger
    }

    get image() {
        return "images/"+number+".png"
    }
}

exports.id = "momobot";

exports.commands = {
    "eventmomo": {
        id: 1,
        description: "",
        callback: async function (message, content) {
            // Take momo in event slot and put her in 6th slot
            // Only available in DM
        }
    },
    "catchmomo": {
        id: 2,
        description: "",
        callback: async function (message, content) {
            // Catch current available momo, if she has 0 HP
            // Only available in tallgrass
        }
    },
    "momofight": {
        id: 3,
        description: "",
        callback: async function (message, content) {
            // Fights current momo, if she has >0 HP
            // Only available in tallgrass
        }
    },
    "momodex": {
        id: 4,
        description: "",
        callback: async function (message, content) {
            // Shows user's current momodes
            // Only works in DM
        }
    },
    "spawnmo": {
        id: 5,
        description: "",
        callback: async function (message, content) {
            // Fiore pls
            // Takes one argument, the momo's number
            // Despawns current momo and replaces her with momo at number
            // Of course, only works if the user has permission
            // AND in DM (not in original requirements, but it's better imo)
        }
    },
    "momosquad": {
        id: 6,
        description: "",
        callback: async function (message, content) {
            // Shows the user's squad
            // Only in DM
        }
    },
    "squadhelp": {
        id: 7,
        description: "",
        callback: async function (message, content) {
            // Shows help for squad management
            // DM only
        }
    },
    "momoexp": {
        id: 8,
        description: "",
        permission: dm_only,
        callback: async function (message, content) {
            // Shows current user's exp
            let user = new User()
            await user.load(message.author.id)
            let msg = "```\n"
               msg += `Lv. ${user.level} - ${message.author.username}\n`
               msg += `    EXP: ${user.xp}/${user.xp_to_next}\n`
               msg += `  TOTAL: ${user.total_exp}\n`
               msg += `Next Lv: ${user.level + 1}\n`
               msg += "```"
            message.channel.send(msg)
        }
    },
    "momoclasshelp": {
        id: 9,
        description: "",
        callback: async function (message, content) {
            // Shows the class summary
            // Only in DM
        }
    },
    "momoclass": {
        id: 10,
        description: "",
        callback: async function (message, content) {
            // To chose a class
            // Only in dm
        }
    },
    "momohelp": {
        id: 11,
        description: "",
        callback: async function (message, content) {
            // For momo help, sends in DM
        }
    }
}

function dm_only (member, message) {
    if (message.channel.type == "dm") return true
    // @TODO maybe add a little message to say it's only available in DMs
    return false
}

function tallgrass_only (member, message) {
    if (message.channel.id == global.settings.momomon_tallgrass_channel) return true
    return false
}

exports.always = async function (message) {
    // Add exp if message is not in DM
    if (message.channel.type == "dm") {
        // Message is in DM
    } else if (message.channel.type == "text") {
        let user = new User()
        await user.load(message.author.id)
        // Exp amount: 10 - 2*number_of_messages_from_user_in_last_messages
        // /2 if message is one word only (no space)
        // min 0
        let exp_amount = 10 - latest_messages.reduce( (acc, val) => acc += val == message.author.id ? 2 : 0)
        // Message is in server, add exp
        latest_messages.shift()
        latest_messages.push(message.author.id)

        if (message.content.indexOf(" ") == -1) exp_amount /= 2
        if (exp_amount < 0) exp_amount = 0
        user.xp += exp_amount
        if (user.level % 5 == 0) {
            let msg
            if (user.level == 10) {
                msg = message.author.username + " just reached level 10! DM me the text !momoclasshelp for info on how to get a name color."
            } else if (user.level == 30) {
                msg = message.author.username + " finally got to level 30! Ask an admin about getting a custom role with the color of your choosing."
            } else {
                msg = message.author.username + " grew to level " + user.level + "!"
            }
            message.channel.send(msg)
        }
    }
}
