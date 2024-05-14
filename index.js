/*jslint es6*/
const Discord = require('discord.js');
const { GatewayIntentBits, Partials, SlashCommandBuilder, ChannelType, Permissions, MessageActionRow, TextInputComponent, MessageButton, MessageSelectMenu, TextInputStyle, Modal, PermissionsFlagsBits } = require('discord.js')
const client = new Discord.Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages], partials: [Partials.Message], });
var mysql = require('mysql2');
var connection = mysql.createConnection({
    host: process.env.db_host,
    user: process.env.db_user,
    password: process.env.db_pass,
    database: process.env.db,
    supportBigNumbers: true,
    bigNumberStrings: true,
    multipleStatements: true
});
connection.connect();
console.log(process.env.app_token);
client.login(process.env.app_token);
const emotes = (str) => str.match(/^<a?:.+?:\d{18,20}>|\p{Extended_Pictographic}/gu);
let users_with_alters = [];

client.on('ready', async () => {

    let register = new SlashCommandBuilder().setName('register')
        .setDescription('Register a new alter.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('How you would like this alter\'s name to appear')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('Emoji prefix for this alter (start message with this emoji to automatically rewrite)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('pfp')
                .setDescription('URL to profile picture that the bot can access')
                .setRequired(true));
    //todo be able to edit name emoji pfp via menu driven system
    await client.application.commands.set([
        register.toJSON()]);
    let users = await connection.promise().query('select distinct uid from alters');
    users_with_alters = users[0];
})
//when adding alter check if emote and uid are already in

client.on('messageCreate', async message => {
    await message.fetch();
    console.log(message.content);
    console.log(emotes(message.content));
    if (emotes(message.content)) {
        console.log(users_with_alters);
        console.log('match ' + message.content);
        let alter_emote = emotes(message.content);
        console.log(alter_emote);
        var alter_info = await connection.promise().query('select * from alters where emoji = ? and uid = ?', [alter_emote[0], message.author.id]);
        if (alter_info[0].length > 0) {
            let webhook_channel;
            if (message.channel.type == ChannelType.GuildPrivateThread || message.channel.type == ChannelType.GuildPublicThread) {
                webhook_channel = message.channel.parent;
            } else {
                webhook_channel = message.channel;
            }
            const webhooks = await webhook_channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.token);
            if (!webhook) {
                webhook = await webhook_channel.createWebhook({ name: 'rrgbot' });
            }
            if (message.channel.type == ChannelType.GuildPrivateThread || message.channel.type == ChannelType.GuildPublicThread) {
                let attachments = [];
                if (message.attachments.size > 0) {
                    attachments = Array.from(message.attachments);
                    console.log(Array.from(message.attachments));
                    // Works if one attachment.
                    // Multiple attachments = array of arrays. Bot will break.
                    let idx = 0;
                    for (let attachment of attachments) {
                        attachments[idx] = attachment[1];
                        idx++;
                    }
                    attachments = attachments.filter(e => typeof (e) === 'object');
                }
                if (message.content.replace(alter_emote[0], '') > 0) {
                    if (attachments) {
                        if (alter_info[0][0].pfp) {
                            await webhook.send({ content: message.content.replace(alter_emote[0], ''), username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp, threadId: message.channel.id, files: attachments });
                        } else {
                            await webhook.send({ content: message.content.replace(alter_emote[0], ''), username: alter_info[0][0].name, threadId: message.channel.id, files: attachments });
                        }
                    } else {
                        if (alter_info[0][0].pfp) {
                            await webhook.send({ content: message.content.replace(alter_emote[0], ''), username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp, threadId: message.channel.id });
                        } else {
                            await webhook.send({ content: message.content.replace(alter_emote[0], ''), username: alter_info[0][0].name, threadId: message.channel.id });
                        }
                    }
                }
            } else {
                let attachment = message.options.getAttachment('attachment');
                if (attachment) {
                    if (alter_info[0][0].pfp) {
                        await webhook.send({ content: message.content.replace(alter_emote[0], ''), username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp, files: [attachment] });
                    } else {
                        await webhook.send({ content: message.content.replace(alter_emote[0], ''), username: alter_info[0][0].name, files: [attachment] });
                    }
                } else {
                    if (alter_info[0][0].pfp) {
                        await webhook.send({ content: message.content.replace(alter_emote[0], ''), username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp });
                    } else {
                        await webhook.send({ content: message.content.replace(alter_emote[0], ''), username: alter_info[0][0].name });
                    }
                }
            }
            await message.delete();
        } else {
            console.log(message.content);
        }

    } else {
        console.log('no match ' + message.content);
    }
})
    .on('interactionCreate', async interaction => {
        if (interaction.commandName == 'register') {
            let name = interaction.options.getString('name');
            let pfp = interaction.options.getString('pfp');
            let emoji = interaction.options.getString('emoji');
            if (!users_with_alters.includes(interaction.member.id)) {
                users_with_alters.push(interaction.member.id);
            }
            await connection.promise().query('insert into alters (uid, emoji, name, pfp) values (?, ?, ?, ?)', [interaction.member.id, emoji, name, pfp]);
            interaction.reply({ message: 'Registered.', ephemeral: true });
        }
    });