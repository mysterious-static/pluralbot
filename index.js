/*jslint es6*/
const Discord = require('discord.js');
const { GatewayIntentBits, Partials, SlashCommandBuilder, Permissions, MessageActionRow, TextInputComponent, MessageButton, MessageSelectMenu, TextInputStyle, Modal, PermissionsFlagsBits } = require('discord.js')
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
    if (users_with_alters.includes(message.author.id) && emotes(message.content)) {
        console.log(message.content);
        let alter_emote = emotes(message.content);
        var alter_info = await connection.promise().query('select * from alters where emote = ? and uid = ?', [alter_emote[0], message.author.id]);
        if (alter_info[0].length > 0) {
            let webhook_channel;
            if (interaction.channel.type == ChannelType.GuildPrivateThread || interaction.channel.type == ChannelType.GuildPublicThread) {
                webhook_channel = interaction.channel.parent;
            } else {
                webhook_channel = interaction.channel;
            }
            const webhooks = await webhook_channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.token);
            if (!webhook) {
                webhook = await webhook_channel.createWebhook({ name: 'rrgbot' });
            }
            if (interaction.channel.type == ChannelType.GuildPrivateThread || interaction.channel.type == ChannelType.GuildPublicThread) {
                let attachment = interaction.options.getAttachment('attachment');
                if (message.content.replace(/^<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu, '') > 0) {
                    if (attachment) {
                        if (alter_info[0][0].pfp) {
                            await webhook.send({ content: message.content.replace(/^<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu, ''), username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp, threadId: interaction.channel.id, files: [attachment] });
                        } else {
                            await webhook.send({ content: message.content.replace(/^<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu, ''), username: alter_info[0][0].name, threadId: interaction.channel.id, files: [attachment] });
                        }
                    } else {
                        if (alter_info[0][0].pfp) {
                            await webhook.send({ content: message.content.replace(/^<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu, ''), username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp, threadId: interaction.channel.id });
                        } else {
                            await webhook.send({ content: message.content.replace(/^<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu, ''), username: alter_info[0][0].name, threadId: interaction.channel.id });
                        }
                    }
                } else {
                    let attachment = interaction.options.getAttachment('attachment');
                    if (attachment) {
                        if (alter_info[0][0].pfp) {
                            await webhook.send({ content: message.content.replace(/^<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu, ''), username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp, files: [attachment] });
                        } else {
                            await webhook.send({ content: message.content.replace(/^<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu, ''), username: alter_info[0][0].name, files: [attachment] });
                        }
                    } else {
                        if (alter_info[0][0].pfp) {
                            await webhook.send({ content: message.content.replace(/^<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu, ''), username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp });
                        } else {
                            await webhook.send({ content: message.content.replace(/^<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu, ''), username: alter_info[0][0].name });
                        }
                    }
                }
            } else {
                log(message.content);
            }
            await message.delete();
        }
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