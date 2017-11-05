const mongo = require("mongodb").MongoClient
const assert = require("assert")
const fs = require("fs")

let db
let momo_db
let tallgrass_channels
mongo.connect(global.settings.mongo_url, async function (err, connection) {
    assert.equal(null, err)
    db = connection
    momo_db = db.collection("momobot")
    let res = await momo_db.findOne({_id: "tallgrass_channels"})
    if (!res) {
        momo_db.insertOne({_id: "tallgrass_channels", channels: {}})
        tallgrass_channels = {}
    } else {
        tallgrass_channels = res.channels
    }
    // Every 30 seconds, check and try to spawn momos in each server
    setInterval(function () {
        console.log("momobot: Trying to spawn momos...")
        for (let cid in tallgrass_channels) {
            let channel = global.client.channels.get(cid)
            if (!channel) continue
            momo_encounter(channel)
        }
    }, 30000)
})

function random(min, max)
{
    return Math.floor(Math.random() * (max-min) + min)
}

let momos = JSON.parse(fs.readFileSync("data/momos.json"))

// It's actually a guild -> 10 latest message author ID array map
let latest_messages = {}

function generate_momo_pool() {
    let momo_pool = []
    // Fill momo pool
    for (var h = 0; h < momos.length; h++) {
        for (var j = 0; j < (101-momos[h].rarity); j++){
            momo_pool.push(h)
        }
    }
    
    return momo_pool
}
// Function helper to pick a new momo
function pick_momo(channel) {
    let momo_pool = tallgrass_channels[channel.id].pool
    let momo = momo_pool[random(0, momo_pool.length)]
    // Don't forget to save the new pool. atm it doesn't change, but it will probably in the future.
    momo_db.updateOne({_id: "tallgrass_channels"}, {$set: {channels: tallgrass_channels}})
    return momo
}

async function momo_encounter(channel) {
    if (!tallgrass_channels[channel.id].encounter) {
        // One chance out of 20 to encounter a momo everytime this function is called
        if (random(0, 20) == 0) {
            console.log("momobot: spawning momo in " + channel.id)
            let encounter = tallgrass_channels[channel.id].encounter = new TallgrassEncounter(channel)
            console.log("momobot: a wild momo appeared: " + encounter.momo.name)
            setTimeout(function () {
                if (tallgrass_channels[channel.id].encounter) {
                    encounter.clean()
                    delete tallgrass_channels[channel.id].encounter
                }
            }, encounter.timer)
        }
    }
}
class TallgrassEncounter {

    constructor(channel, momo = null) {
        this.channel = channel
        this.momo = (momo || new Momo(pick_momo(channel)))
        this.momo.hp = 0
        this.amount = 3
        // Calm momos stay 2 minutes
        this.timer = 120000
        this.lifeword = null
        this.try_catch = false

        let message = "", hp_message = ""
        if (random(0, 4) == 0) {
            // The momo is angry.
            message = TallgrassEncounter.captions[random(0, TallgrassEncounter.captions.length)]
            this.momo.hp = Math.ceil(this.momo.rarity/7)
            this.lifeword = TallgrassEncounter.hp[random(0, TallgrassEncounter.hp.length)]
            hp_message = "```" + `${this.lifeword}: ${this.momo.hp}` + "```"
            // Angry momos stay 5 minutes
            this.timer = 300000
        }
        this.send_messages(message, hp_message)
    }

    async send_messages(message, hp_message) {
        let image = this.momo.image
        if (message != "") {
            this.message = await this.channel.send(message, {files: [image]})
        } else {
            this.message = await this.channel.send({files: [image]})
        }
        if (hp_message != "") this.hp_message = await this.channel.send(hp_message)
    }

    async send_hpmsg() {
        this.hp_message = await this.channel.send("```" + `${this.lifeword}: ${this.momo.hp}` + "```")
    }

    async send_image() {
        this.message = await this.channel.send({files: [this.momo.image]})
    }

    clean() {
        if (this.message) this.message.delete()
        if (this.hp_message) this.hp_message.delete()

        if (this.amount != 3 && this.amount != 0){
            this.channel.send(`:dash: The remaining ${this.momo.name}s fled. Congrats to those who caught one! Data was saved to the !momodex.
:exclamation: Don't forget to !swap it into your !momosquad if you want to keep it!`)
        } else if (this.amount == 3 && this.try_catch) {
            this.channel.send(":dash: The Momo left.")
        } else if (this.amount == 0) {
            this.channel.send(`:floppy_disk: All of the ${this.moo.name}s were caught. Data was saved to the !momodex.
:exclamation: Don't forget to !swap it into your !momosquad if you want to keep it!`)
        }
    }

    clean_hpmsg() {
        if (this.hp_message) this.hp_message.delete()
    }

    clean_msg() {
        if (this.message) this.message.delete()
    }
}

TallgrassEncounter.captions = [
    ":anger: This one's not going down without a fight!",
    ":anger: A wild Momo appeared!",
    ":anger: A Momo draws near!",
    ":anger: Oooh here she comes!",
    ":anger: Hey! Watch out!",
    ":anger: Uh oh, she looks furious!",
    ":anger: You won't be catching this one that easily!",
    ":anger: A weapon to surpass Metal Gear?!",
    ":anger: WOAH!!",
    ":anger: Dang, she looks tough!"
]
TallgrassEncounter.hp = [
    "Hit Points",
    "Health",
    "Life",
    "Energy",
    "Stamina",
    "Vitality",
    "Endurance",
    "Gumption",
    "Power",
    "Strength",
    "Moe",
    "Moxy",
    "Guts",
    "Bravery"
]

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
            this.momos = []
            this.momodex = []
            this._peaches = 0
            momo_db.insertOne({"_id": id, user: this})
        } else {
            // User exists, copy it (can't assign user.user to this)
            for (let prop in user.user) this[prop] = user.user[prop]
            for (let momo in this.momos) {
                if (!this.momos[momo]) continue
                this.momos[momo] = Object.assign(new Momo(), this.momos[momo])
            }
        }

    }
    
    set peaches(peaches) {
        this._peaches = peaches
        this.save()
    }

    get peaches() {
        return this._peaches
    }

    set xp(xp) {
        this._xp = xp
        while (this._xp >= this.xp_to_next) {
            // level up
            this.level++
            this._xp -= this.xp_to_next
        }
        this.save()
    }   

    get xp() {
        return this._xp
    }

    get xp_to_next() {
        let xp = 100
        for (let lvl = 1; lvl < this.level; lvl++) {
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

    save() {
        momo_db.updateOne({"_id": this._id}, { $set: {user: this}}) 
    }
}

class Momo {
    constructor(type = 0) {
        this.type = type
        this.level = 1
        this.xp = random(0, (momos[type].rarity) * 10)
        this.power = Math.ceil(momos[type].rarity/2)
        this._hp = (4 + (Math.ceil((momos[type].rarity)/10)*10))
    }

    set hp(hp) {
        if (hp < 0) hp = 0
        this._hp = hp
    }

    get hp() {
        return this._hp
    }

    set xp(xp) {
        this._xp = xp
        while (this._xp >= this.xp_to_next) {
            if (this.level >= 99) break
            this._xp -= this.xp_to_next
            this.level++
            this.hp += 2
            this.power += random(0, momos[this.type].rarity + 1)
        }

        while (this._xp < 0) {
            if (this.level <= 1) {
                this._xp = 0
                break
            }
            this._xp += this.xp_to_next - this.level
            this.level--
            this.hp -= 2
            this.power -= random(0, momos[this.type].rarity + 1)
        }
        if (this.power < 1) this.power = 1
    }

    get xp() {
        return this._xp
    }

    get rarity() {
        return momos[this.type].rarity
    }

    get flavor() {
        return momos[this.type].flavor
    }

    get name() {
        return momos[this.type].name
    }

    get xp_to_next() {
        let xp = 0
        for (let i = 1; i <= this.level; i++) {
            xp += i
        }
        return xp
    }

    get image() {
        return "data/Momos/"+(this.type+1)+".png"
    }
}

Momo.image = function (type) {
    return `data/Momos/${type+1}.png`
}

class Pet {
    constructor(type, hp) {
        this.type = type
        this.hp = hp
    }
}

exports.id = 9000
exports.name = "momobot"

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
        permission: tallgrass_only,
        callback: async function (message, content) {
            // Catch current available momo, if she has 0 HP
            let channel = message.channel
            let encounter = tallgrass_channels[channel.id].encounter
            // There's no current encounter, do nothing
            if (!encounter) return
            // Otherwise, check if it has HP. If it does, notify the user and do nothing.
            if (encounter.momo.hp > 0) {
                channel.send(":no_entry_sign: That Momo is too out of control to catch! Weaken it with !momofight first!")
                return
            }
            // If it doesn't have HP, remove one from the encounter number and create a new momo in the 6th slot of the user
            let user = new User()
            encounter.try_catch = true
            await user.load(message.author.id)
            if (user.momodex[encounter.momo.type]) {
                channel.send(":no_entry_sign: You already have that Momo, give someone else a chance.")
                return
            }
            encounter.amount--
            user.momos[5] = new Momo(encounter.momo.type)
            user.momodex[encounter.momo.type] = true
            channel.send(`:gift: Gotcha! ${message.author.username} caught a ${encounter.momo.name}! There's ${encounter.amount} left.`)
            console.log(`momobot: ${message.author.username} (${message.author.id}) caught ${encounter.momo} in channel ${message.channel.id}`)
            if (encounter.amount == 0) {
                message.channel.send(":floppy_disk: All of the "+encounter.momo.name+"s were caught. Data was saved to the !momodex.\n:exclamation: Don't forget to !swap it into your !momosquad if you want to keep it!")
                encounter.clean()
                delete tallgrass_channel[channel.id].encounter
            }
            user.save()
        }
    },
    "momofight": {
        id: 3,
        description: "",
        permission: tallgrass_only,
        callback: async function (message, content) {
            // Fights current momo, if she has >0 HP
            // Find out whether the user has a momo or not
            let user = new User()
            await user.load(message.author.id)
            let channel = message.channel
            let encounter = tallgrass_channels[channel.id].encounter
            // There's no current encounter, do nothing
            if (!encounter) return
            // Momo has 0 HP, do nothing
            if (encounter.momo.hp == 0) return
            // If the user has no momo
            if (user.momos == []) {
                message.channel.send(":no_entry_sign: You don't have any Momos in your squad to fight with! Use the command !momosquad in a DM with me to manage your team.")
                return
            }
            // Since we're not entirely sure how many momos the user have, let's make a new array with only those
            // We might have something in 5th cell, but empty cells before
            // @PBUG
            let usermomos = user.momos.filter((m)=>m)
            // Chose the fighter
            let fighter = usermomos[random(0, usermomos.length)]
            // Calculate damage
            let damage = Math.ceil(random(0, fighter.power)/encounter.momo.rarity)
            message.channel.send(`:boom: ${message.author.username}'s ${fighter.name} attacks! ${damage} dealt to the aggressive Momo!`)
            // Do damage
            encounter.momo.hp -= damage
            encounter.clean_hpmsg()
            if (encounter.momo.hp > 0) {
                encounter.send_hpmsg()
                return
            }
            // The momo doesn't have any HP left, remove messages, send the weakened message and the image
            encounter.clean_hpmsg()
            encounter.clean_msg()
            message.channel.send(":dizzy: The wild Momo is weakened!")
            encounter.send_image()
        }
    },
    "momodex": {
        id: 4,
        description: "",
        permission: dm_only,
        callback: async function (message, content) {
            // Shows user's current momodex
            let user = new User()
            await user.load(message.author.id)
            let number = parseInt(content)
            // Check if the user supplied a number
            if (!isNaN(number)) {
                // They did
                // Check if the user has that momo in their momodex, return if they don't
                if (!user.momodex[number-1]) return
                // Output info on that specific momo
                message.channel.send("```" + `
Number ${number}: ${momos[number-1].name}
${momos[number-1].flavor}
*RARITY*: ${momos[number-1].rarity}
` + "```", {files: [Momo.image(number-1)]})
                return
            }
            let total_caught = 0, msg = ""
            user.momodex.forEach((momo, index)=>{
                if (momo) {
                    total_caught += 1
                    msg += `#${("     " + (index+1)).slice(-3)}. ${momos[index].name}\n` 
                }
            })
            msg = "```" + `MOMODEX - ${total_caught}/${momos.length}\n` + msg + "Type !momodex [number] to see information for the specified Momo.```"
            message.channel.send(msg)
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
        permission: dm_only,
        callback: async function (message, content) {
            // Shows the user's squad
            let user = new User()
            await user.load(message.author.id)
            let msg = "```"+`${message.author.username}'s Momo Squad\n`
            msg += user.momos.map((m,i)=>(`${i==5?"X":(i+1)}) ` + (m?`Lv. ${m.level} ${m.name}`:"--Empty Slot--"))).join("\n") 
            msg += `
!! 6th slot will be replaced when a new Momo is added. !!
Use !squadhelp for a list of commands

(Peaches: ${user.peaches})` 
            msg += "```"
            message.channel.send(msg)
        }
    },
    "squad": {
        id: 13,
        description: "",
        permission: dm_only,
        callback: async function (message, content) {
            let number = parseInt(content)-1
            if (isNaN(number)) {
                message.channel.send("Invalid command, see !squadhelp for format help.")
                return
            }
            if (number < 0 || number > 5) {
                message.channel.send("Invalid slot number.")
                return
            }
            let user = new User()
            await user.load(message.author.id)
            let momo = user.momos[number]
            if (!momo) {
                message.channel.send("This slot is empty!")
                return
            }
            message.channel.send("```" + `
Number ${momo.type+1}: ${momo.name}
${momo.flavor}
*RARITY*: ${momo.rarity}

[ Lv. ${momo.level} | xp: ${momo.level==99?"MAX LV":`${momo.xp}/${momo.xp_to_next}`}] 
HP: ${momo.hp}` + "```", {files: [momo.image]})

        }
    },
    "summon": {
        id: 20,
        description: "",
        permission: dm_only,
        callback: async function (message, content) {
            let target = parseInt(content)
            if (isNaN(target)) {
                message.channel.send("Invalid input, use the Momo's Momodex number for this command.")
                return"Summoned a "+momos[target-1].name+" into the squad's X slot using "+cost+" Peaches!```"
            }
            if (target < 1 || target > momos.length) {
                message.channel.send("Invalid number. Must be between 1 and "+momos.length)
                return
            }
            let user = new User()
            await user.load(message.author.id)
            if (!user.momodex[target-1]) {
                message.channel.send("That Momo isn't in your Momodex.")
                return
            }
            let cost = momos[target-1].rarity*10
            if (cost > user.peaches) {
                message.channel.send("You don't have enough Peaches!")
                return
            }
            user.peaches -= cost
            user.momos[5] = new Momo(target-1)
            message.channel.send("```" + `Summoned a ${momos[target-1].name} into the squad's X slot using ${cost} Peaches!`+ "```")
            await user.save()
            exports.commands.momosquad.callback(message, "")
        }
    },
    "feed": {
        id: 30,
        description: "",
        permission: dm_only,
        callback: async function (message, content) {
            let [momo, amount] = content.split(" ").map((n)=>parseInt(n))
            if (isNaN(momo) || isNaN(amount)) {
                message.channel.send("Invalid command, see !squadhelp for format help.")
                return
            }
            if (momo < 1 || momo > 5) {
                message.channel.send("Invalid target number. Must be between 1 and 5.")
                return
            }
            if (momo == 6) {
                message.channel.send("You can't feed a Momo in the X slot.")
                return
            }
            if (amount <= 0) {
                message.channel.send("Invalid peach number. Must be 1 or greater.")
                return
            }
            let user = new User()
            await user.load(message.author.id)
            if (amount > user.peaches) {
                message.channel.send("You don't have that many peaches!")
                return
            }
            if (!user.momos[momo-1]) {
                message.channel.send("This slot is empty!")
                return
            }
            let m = user.momos[momo-1]
            let level = m.level
            m.xp += amount
            user.peaches -= amount
            await user.save()
            message.channel.send("```" + `
Fed ${amount} to Momo #${momo}. ${(m.level-level>0)?`\n${m.name} grew ${m.level-level} level(s)!`:""}
` + "```")
            exports.commands.squad.callback(message, momo)
        }
    },
    "swap": {
        id: 40,
        description: "",
        permission: dm_only,
        callback: async function (message, content) {
            let [a, b] = content.split(" ").map((n)=>parseInt(n))
            if (isNaN(a) || isNaN(b)) {
                message.channel.send("Invalid command, see !squadhelp for format help.")
                return
            }
            if(a < 1 || a > 6 || b < 1 || b > 6) {
                message.channel.send("Numbers must be between 1 and 6.")
                return
            }
            if (a == b) {
                message.channel.send("You can't swap that with itself!")
                return
            }
            let user = new User()
            await user.load(message.author.id)
            let temp = user.momos[a-1]
            user.momos[a-1] = user.momos[b-1]
            user.momos[b-1] = temp
            await user.save()
            message.channel.send("```" + `Swapped Momos #${a} and #${b}!` + "```")
            exports.commands.momosquad.callback(message, "")
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
               msg += `Next Lv: ${user.xp_to_next - user.xp}\n`
               msg += "```"
            message.channel.send(msg)
        }
    },
    "momoclasshelp": {
        id: 9,
        description: "",
        permission: guild_only,
        callback: async function (message, content) {
            // Shows the class summary
            let guild = await momo_db.findOne({_id: message.channel.guild.id})
            if (!guild) {
                message.channel.send("There's no level 10 class in this server yet. Please ask an administrator.")
                return
            }
            let text = "If you're level 10 or higher, use the command !momoclass in the server, along with a class name, to be promoted. Here's a list of available classes:\n```\n"
            text += Object.keys(guild.lv10_classes).join("\n") + "```"
            text += "Choosing a class will do nothing but award you with a fancy color for your name in chat. http://puu.sh/sZZPh/d47d0e6fdb.png\n"
            text += "At level 30, you will be able to create your own custom class with a color of your choosing."
            message.channel.send(text);
        }
    },
    "momoclass": {
        id: 10,
        description: "",
        permission: guild_only,
        callback: async function (message, content) {
            // To chose a class
            let user = new User()
            await user.load(message.author.id)
            if (user.level < 10) {
                message.channel.send("Sorry, you have to be level 10 or higher to choose a class.")
                return
            }
            let guild = await momo_db.findOne({_id: message.channel.guild.id})
            if (!guild) {
                message.channel.send("There's no level 10 class in this server yet. Please ask an administrator.")
                return
            }
            // Check if the user has any of the lv10 roles
            let user_classes = message.member.roles.array().map((r)=>r.id)
            if (user_classes.some((role, i)=>Object.values(guild.lv10_classes).includes(role))) {
                message.channel.send("It looks like you already belong to a class, ask an admin for help if necessary.")
                return
            }
            if (!guild.lv10_classes[content]) {
                message.channel.send("The role you've asked for doesn't exist! Please be careful, it's case-sensitive.")
                return
            }
            message.member.addRole(guild.lv10_classes[content])
            message.channel.send(`Congratulation ${message.author.username}, you've been promoted to the ${content} class!`)
        }
    },
    "addmomoclass": {
        id: 50,
        description: "",
        permission: [global.default_permission(exports.name, "addmomoclass"), guild_only],
        callback: async function (message, content) {
            let guild = await momo_db.findOne({_id: message.channel.guild.id})
            if (!guild) {
                // No list of lv10 classes have been found.
                // Create one
                guild = {_id: message.channel.guild.id, lv10_classes: {}}
                await momo_db.insertOne(guild)
            }
            let [name, id] = content.split(" ")
            if (!name || !id) {
                // Content doesn't include the name of the class.
                message.channel.send("You need to supply the name and the id of the role.")
                return
            }
            guild.lv10_classes[name] = id
            momo_db.updateOne({_id: message.channel.guild.id}, {$set: {lv10_classes: guild.lv10_classes}})
            message.channel.send(`Successfully added role ${id} with name ${name} to the list of lvl 10 classes!`)
        }
    },
    "momohelp": {
        id: 11,
        description: "",
        callback: async function (message, content) {
            // For momo help, sends in DM
        }
    },
    "momotallgrass": {
        id: 12,
        description: "",
        callback: async function (message, content) {
            // To say that this channel is a tallgrass channel.
            tallgrass_channels[message.channel.id] = {pool: generate_momo_pool()}
            momo_db.updateOne({_id: "tallgrass_channels"}, {$set :{channels: tallgrass_channels}})
        }
    }
}

function dm_only (member, message) {
    if (message.channel.type == "dm") return true
    // @TODO maybe add a little message to say it's only available in DMs
    return false
}

function tallgrass_only (member, message) {
    if (Object.keys(tallgrass_channels).includes(message.channel.id)) return true
    return false
}

exports.always = async function (message) {
    // Add exp if message is not in DM
    if (message.channel.type == "dm") {
        // Message is in DM
    } else if (message.channel.type == "text") {
        let user = new User()
        await user.load(message.author.id)
        let prev_lvl = user.level
        // Ensure the channel list of latest messages exists
        if (!latest_messages[message.channel.id]) latest_messages[message.channel.id] = [0,0,0,0,0,0,0,0,0,0]
        // Exp amount: 10 - 2*number_of_messages_from_user_in_last_messages
        // /2 if message is one word only (no space)
        // min 0
        let exp_amount = 10 - latest_messages[message.channel.id].reduce( (acc, val) => acc += val == message.author.id ? 2 : 0)
        // Message is in server, add exp
        latest_messages[message.channel.id].shift()
        latest_messages[message.channel.id].push(message.author.id)

        if (message.content.indexOf(" ") == -1) exp_amount /= 2
        if (exp_amount < 0) exp_amount = 0
        user.xp += exp_amount
        user.peaches += exp_amount * 10
        if (user.level % 5 == 0 && user.level != prev_lvl) {
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
