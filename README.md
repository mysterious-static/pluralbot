__**How do I put a profile picture in a place the bot can access it using only Discord?**__
- Add pluralbot to a personal server and post the picture to that server somewhere.
- Right click the image and select "Copy Link".
- Paste the link into the appropriate parameter in the `/register` command.
- Submit the command.

__**Why doesn't the bot translate custom emoji?**__
The bot, I *believe*, can only access emoji in servers that it is invited to. I think I've got that right. I gotta test it more.
__**I can't reply to messages, why not?**__
pluralbot uses webhooks for its functionality, and unfortunately Discord does not have support for webhook replies to messages. If they ever add this support I've already written code that theoretically would work with it so it'd be trivial for me to set it up in the event it becomes possible. Currently the reply functionality works the same way as other major plural bots on Discord using message embeds for context.
