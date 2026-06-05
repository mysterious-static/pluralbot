/*jslint es6*/
const Discord = require('discord.js');
const { GatewayIntentBits, Partials, SlashCommandBuilder, ChannelType, EmbedBuilder, Permissions, MessageActionRow, TextInputComponent, MessageButton, MessageSelectMenu, TextInputStyle, Modal, PermissionsFlagsBits } = require('discord.js')
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
client.login(process.env.app_token);
const emotes = (str) => str.match(/^<a?:.+?:\d{18,20}>|\p{Extended_Pictographic}/gu);
let users_with_alters = new Set();

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
    let list = new SlashCommandBuilder().setName('list')
    .setDescription('List your registered alters.');
    let remove = new SlashCommandBuilder().setName('remove')
    .setDescription('Remove an alter.')
    .addStringOption(option =>
    option.setName('name')
    .setDescription('Name of the alter you want to remove (check with /list). Case sensitive.')
    .setRequired(true));
    let latch = new SlashCommandBuilder().setName('latch')
    .setDescription('Enable latching to previously fronting member.')
    .addBooleanOption(option =>
    option.setName('enabled')
    .setDescription('Whether or not to enable latching.')
    .setRequired(true));
    //todo be able to edit name emoji pfp via menu driven system
    await client.application.commands.set([
        register.toJSON(),
                                          list.toJSON(),
                                          remove.toJSON(),
                                        latch.toJSON()]);
    let users = await connection.promise().query('select distinct uid from alters');
    users_with_alters = new Set(users[0].map(row => row.uid));
});
//when adding alter check if emote and uid are already in

client.on('messageCreate', async message => {
    await message.fetch();
    if (!message.webhookId && users_with_alters.has(message.member.id)) {
        let alter_info = null;
        let alter_emote = null;
        if (emotes(message.content)) {
            alter_emote = emotes(message.content);
            alter_info = await connection.promise().query('select * from alters where emoji = ? and uid = ?', [alter_emote[0], message.member.id]);
        }
        let latch = null;
        if (!alter_info) {
            // Check latch
            latch = await connection.promise().query('select a.* from latch l join alters a on a.id = l.last_alter_id where l.uid = ? and l.enabled = true', [message.member.id]);
            if (latch[0].length > 0) {
                alter_info = latch;
            } else {

            }
        }
        if (alter_info[0].length > 0 && (message.content.startsWith(alter_emote[0]) || latch)) {
            if (message.content.startsWith(alter_emote[0])) {
            await connection.promise().query('insert into latch (uid, last_alter_id) values (?, ?) on duplicate key update last_alter_id = values(last_alter_id)', [message.member.id, alter_info[0][0].id]);
            // TODO: Update the latch cache, when latching is implemented. Then we can make the query async.
            }
            let webhook_channel;
            if (message.channel.type == ChannelType.GuildPrivateThread || message.channel.type == ChannelType.GuildPublicThread) {
                webhook_channel = message.channel.parent;
            } else {
                webhook_channel = message.channel;
            }
            const webhooks = await webhook_channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.token);
            if (!webhook) {
                webhook = await webhook_channel.createWebhook({ name: 'pluralbot' });
            }
            if (message.channel.type == ChannelType.GuildPrivateThread || message.channel.type == ChannelType.GuildPublicThread) {
                let attachments = [];
                if (message.attachments.size > 0) {
                    attachments = Array.from(message.attachments);
                    // Works if one attachment.
                    // Multiple attachments = array of arrays. Bot will break.
                    let idx = 0;
                    for (let attachment of attachments) {
                        attachments[idx] = attachment[1];
                        idx++;
                    }
                    attachments = attachments.filter(e => typeof (e) === 'object');
                }
                // use if message.type == 'reply' then await message.getReference() to get reply message if they ever implement webhook replies to messages
                if (message.content.replace(alter_emote[0], '').length > 0) {
                    if (message.type == 19) {
                        let messageReference = await message.fetchReference();
                        let embed = new EmbedBuilder()
                        .setAuthor({ name: messageReference.author.displayName + '↩️', iconURL: messageReference.author.avatarURL() })
                        .setDescription(`[Reply to:](<https://discord.com/channels/${messageReference.guildId}/${messageReference.channelId}/${messageReference.id}>) ${(messageReference.content.length > 97 ? messageReference.content.substring(0, 97) + '...' : messageReference.content)}`);
                        if (attachments.length > 0) {


                            if (alter_info[0][0].pfp) {
                                
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), embeds: [embed], username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp, threadId: message.channel.id, files: attachments });
                            } else {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), embeds: [embed], username: alter_info[0][0].name, threadId: message.channel.id, files: attachments });
                            }
                        } else {
                            if (alter_info[0][0].pfp) {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), embeds: [embed], username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp, threadId: message.channel.id });
                            } else {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), embeds: [embed], username: alter_info[0][0].name, threadId: message.channel.id });
                            }
                        }
                    } else {
                        if (attachments.length > 0) {
                            if (alter_info[0][0].pfp) {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp, threadId: message.channel.id, files: attachments });
                            } else {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), username: alter_info[0][0].name, threadId: message.channel.id, files: attachments });
                            }
                        } else {
                            if (alter_info[0][0].pfp) {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp, threadId: message.channel.id });
                            } else {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), username: alter_info[0][0].name, threadId: message.channel.id });
                            }
                        }
                    }
                    await message.delete();
                }
            } else {
                let attachments = [];
                if (message.attachments.size > 0) {
                    attachments = Array.from(message.attachments);
                    // Works if one attachment.
                    // Multiple attachments = array of arrays. Bot will break.
                    let idx = 0;
                    for (let attachment of attachments) {
                        attachments[idx] = attachment[1];
                        idx++;
                    }
                    attachments = attachments.filter(e => typeof (e) === 'object');
                }
                if (message.content.replace(alter_emote[0], '').length > 0) {
                    console.log(message.type);
                    if (message.type == 19) {
                        let messageReference = await message.fetchReference();
                        console.log(messageReference);
                        let embed = new EmbedBuilder()
                        .setAuthor({ name: messageReference.author.displayName + '↩️', iconURL: messageReference.author.avatarURL() })
                        .setDescription(`[Reply to:](<https://discord.com/channels/${messageReference.guildId}/${messageReference.channelId}/${messageReference.id}>) ${(messageReference.content.length > 97 ? messageReference.content.substr(0, 96) + '...' : messageReference.content)}`);
                        if (attachments.length > 0) {
                            if (alter_info[0][0].pfp) {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), embeds: [embed], username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp, files: attachments });
                            } else {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), embeds: [embed], username: alter_info[0][0].name, files: attachments });
                            }
                        } else {
                            if (alter_info[0][0].pfp) {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), embeds: [embed], username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp });
                            } else {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), embeds: [embed], username: alter_info[0][0].name });
                            }
                        }
                    } else {
                        if (attachments.length > 0) {
                            if (alter_info[0][0].pfp) {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp, files: attachments });
                            } else {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), username: alter_info[0][0].name, files: attachments });
                            }
                        } else {
                            if (alter_info[0][0].pfp) {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), username: alter_info[0][0].name, avatarURL: alter_info[0][0].pfp });
                            } else {
                                await webhook.send({ content: (message.content.startsWith(alter_emote[0]) ? message.content.replace(alter_emote[0], '') : message.content), username: alter_info[0][0].name });
                            }
                        }
                    }
                    await message.delete();
                }
            }

        } else {
            // nothin'
        }

    } else {
        // do not process the messages
    }
})
.on('interactionCreate', async interaction => {
    if (interaction.commandName == 'register') {
        let name = interaction.options.getString('name');
        let pfp = interaction.options.getString('pfp');
        let emoji = interaction.options.getString('emoji');
        if (!users_with_alters.has(interaction.member.id)) {
            users_with_alters.add(interaction.member.id);
        }
        await connection.promise().query('insert into alters (uid, emoji, name, pfp) values (?, ?, ?, ?)', [interaction.member.id, emoji, name, pfp]);
        interaction.reply({ content: 'Registered.', ephemeral: true });
    } else if (interaction.commandName == 'list') {
        let alters = await connection.promise().query('select * from alters where uid = ?', [interaction.member.id]);
        let msg = '```';
        for (const alter of alters[0]) {
            msg = msg.concat(`\n${alter.name}`);
        }
        msg = msg.concat(`\n\`\`\``);
        console.log(msg);
        interaction.reply({ content: msg, ephemeral: true });
    } else if (interaction.commandName == 'remove') {
        await connection.promise().query('delete from alters where uid = ? and name = ?', [interaction.member.id, interaction.options.getString('name')]);
        const remaining = await connection.promise().query('select count(*) as count from alters where uid = ?', [interaction.member.id]);
        if (remaining[0][0].count === 0) {
            users_with_alters.delete(uid); // Update the in memory cache
        }
        interaction.reply({ content: 'Removed alter (if exists).', ephemeral: true });
    } else if (interaction.commandName == 'latch') {
        const enabled = interaction.options.getBoolean('enabled');
        await connection.promise().query('insert into latch (uid, enabled) values (?, ?) on duplicate key update enabled = values(enabled)', [interaction.member.id, enabled]);
        await interaction.reply({content: enabled ? 'Latch enabled.' : 'Latch disabled.', ephemeral: true});     
    }
});
