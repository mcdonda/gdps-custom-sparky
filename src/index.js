import 'dotenv/config';
import settingsData from './settings.json' with { type: 'json' };

import { Client, GatewayIntentBits, IntentsBitField, EmbedBuilder, Message, ActionRowBuilder, ButtonStyle, ButtonBuilder, ActivityType } from 'discord.js';


const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent
    ],
});

import fs from 'node:fs/promises';

var activeChannels = []; // Channels that have an active game currently


client.on('interactionCreate', async (interaction) => {


    // Adding a level to be guessed
    if (interaction.commandName === "add-level") {

        if (!hasPerms(interaction)) {
            return interaction.reply({ content: 'You do not have permissions to use this command.', ephemeral: true });
        }

        const levelName = interaction.options.getString('level-name')
        const image = interaction.options.getString('image')
        const diff = interaction.options.getString('difficulty')
        
        const rawData = await fs.readFile('./levels.json', 'utf8');
        const data = JSON.parse(rawData);

        if (data.levels.some(level => level.name === levelName)) {
            return await interaction.reply({
                content: 'That level already exists',
                ephemeral: true
            });
        }

        data.levels.push({
            name: levelName,
            image: image,
            difficulty: diff
        });

        await fs.writeFile('./levels.json', JSON.stringify(data, null, 2));

        await interaction.reply(`✅ Added **${levelName}**`);
    }

    // Starting the guessing
    if (interaction.commandName === "guess") {

        const allowedChannels = settingsData.allowedChannels

        if (!allowedChannels.includes(interaction.channelId) && allowedChannels.length > 0) { 
            var channelsString = "<#" + allowedChannels.join(">, <#") + ">"
            return interaction.reply({ content: `You cannot play in this channel. Try in ${channelsString}`, ephemeral: true });
        }

        startGuess(interaction, interaction.options.getString('difficulty'));
    }

    // Checking points
    if (interaction.commandName === "points") {
        var user = 0;
        if (interaction.options.getUser('user')) {
            user = interaction.options.getUser('user');
        } else {
            user = interaction.user
        }

        const pointsRaw = await fs.readFile('./points.json', 'utf8');
        const pointsData = JSON.parse(pointsRaw);
        
        let userProfile = pointsData.users.find(u => u.id === user.id);
        if (userProfile) {
            interaction.reply(`<@${user.id}> has **${userProfile.points}** points!`)
        } else {
            interaction.reply(`<@${user.id}> doesn't have any points yet, use **/guess** to earn some.`)
        }
    }

    // levels list admin command
    if (interaction.commandName === "levels-list") {
        if (!hasPerms(interaction)) {
            return interaction.reply({ content: 'You do not have permissions to use this command.', ephemeral: true });
        }

        // All of this was written by google gemini tbh:
        let currentPage = 0;

        // Helper function to generate the message payload
        const generateMessage = async (page) => {
            const { embeds, components } = await levelsList(page); // Ensure your function returns these
            return { embeds: [embeds], components: [components], fetchReply: true, ephemeral: true };
        };

        const response = await interaction.reply(await generateMessage(currentPage));

        // Create the collector on the message we just sent
        const collector = response.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id, // Only the person who ran the command can click
            time: 60000 // 60 seconds
        });

        collector.on('collect', async (i) => {
            try {
                if (i.customId === 'lvlsnext') currentPage++;
                if (i.customId === 'lvlsprevious') currentPage--;

                await i.update(await generateMessage(currentPage)).catch(err => {
                    console.log("Couldn't update: Message likely deleted or interaction expired.");
                });
            } catch (error) {
                console.error("Error in button collector:", error);
            }
        });


        collector.on('end', () => {
            // Optional: Disable buttons when the collector expires
            interaction.editReply({ components: [] });
        });
    }

    // leaderboard
    if (interaction.commandName === "points-leaderboard") {
        let currentPage = 0;

        // I just reused gemini's levels-list code here:

        // Helper function to generate the message payload
        const generateMessage = async (page) => {
            const { embeds, components } = await leaderboard(page); // Ensure your function returns these
            return { embeds: [embeds], components: [components], fetchReply: true };
        };

        const response = await interaction.reply(await generateMessage(currentPage));

        // Create the collector on the message we just sent
        const collector = response.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id, // Only the person who ran the command can click
            time: 60000 // 60 seconds
        });

        collector.on('collect', async (i) => {
            try {
                if (i.customId === 'lbnext') currentPage++;
                if (i.customId === 'lbprevious') currentPage--;

                await i.update(await generateMessage(currentPage)).catch(err => {
                    console.log("Couldn't update: Message likely deleted or interaction expired.");
                });
            } catch (error) {
                console.error("Error in button collector:", error);
            }
        });


        collector.on('end', () => {
            // Optional: Disable buttons when the collector expires
            interaction.editReply({ components: [] });
        });
    }

    // Requesting levels to be added
    if (interaction.commandName === "request-sparky") {
        if (settingsData.requestChannel === "") {
            console.log("No request channel ID is specified in src/settings.json. Please paste the channel ID for the channel you want level requests to be forwarded to.");
            return interaction.reply("Requests have not been set up yet.");
        }
        const levelName = interaction.options.getString('level-name');
        const image = interaction.options.getAttachment('image');

        interaction.reply({ content: `Request sent for **${levelName}**`, ephemeral: true });

        
        const channel = interaction.client.channels.cache.get(settingsData.requestChannel);

        if (!channel || !channel.isTextBased()) {
            return interaction.followUp({ content: "Error: Could not find the request channel.", ephemeral: true });
        }

        const embed = new EmbedBuilder().setTitle(`Level Name: ${levelName}`).setImage(image?.url || null).setDescription(`Request sent from <@${interaction.user.id}>`).setColor('Fuchsia');
        await channel.send({ content: "New Sparky Level Request", embeds: [embed] });
    }

    // Play again button:
    if (interaction.customId === "play-again") {
        startGuess(interaction, "Any");
    }

    // edit-level:
    if (interaction.commandName === "edit-level") {
        if (!hasPerms) {
            interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true});
        }
        const levelName = interaction.options.getString('level-name');

        const rawData = await fs.readFile('./levels.json', 'utf8');
        const data = JSON.parse(rawData);

        const level = data.levels.find(l => l.name === levelName);

        if (!level) {
            return interaction.reply({ content: `Level '${levelName}' not found. Did you capatalize?`, ephemeral: true });
        }

        const newName = interaction.options.getString('new-name');
        const newDiff = interaction.options.getString('new-difficulty');
        const newImage = interaction.options.getString('new-image');

        var responseString = `Edited ${levelName}:`;

        if (newName) {
            level.name = newName;
            responseString += `\n${levelName} -> ${newName}`;
        }
        if (newDiff) {
            level.difficulty = newDiff;
            responseString += `\n${level.difficulty} -> ${newDiff}`;
        }
        if (newImage) {
            level.image = newImage;
            responseString += `\nNew image: ${newImage}`;
        }

        await fs.writeFile('./levels.json', JSON.stringify(data, null, 2));

        await interaction.reply({ content: responseString, ephemeral: true});
    }
});

// Generating the embed for the levels list
async function levelsList(page) { 
    const rawData = await fs.readFile('./levels.json', 'utf8');
    const data = JSON.parse(rawData);
    
    let levelsString = "";
    // Calculate start and end for slicing
    const start = page * 10;
    const items = data.levels.slice(start, start + 10);

    items.forEach((level, index) => {
        levelsString += `${start + index + 1}. **${level.name}** (${level.difficulty})\n`;
    });

    const embed = new EmbedBuilder()
        .setTitle(`Levels List (Page ${page + 1})`)
        .setDescription(levelsString || "No more levels.")
        .setColor('Blue');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lvlsprevious')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0), // Disable if on first page
        new ButtonBuilder()
            .setCustomId('lvlsnext')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(start + 10 >= data.levels.length) // Disable if no more levels
    );

    return { embeds: embed, components: row };
}

// generating embed for leaderboard
async function leaderboard(page) { 
    const rawData = await fs.readFile('./points.json', 'utf8');
    const data = JSON.parse(rawData);
    
    data.users.sort((a,b) => b.points - a.points);
    let lbString = "";
    // Calculate start and end for slicing
    const start = page * 10;
    const items = data.users.slice(start, start + 10);

    items.forEach((user, index) => {
        lbString += `${start + index + 1}. <@${user.id}> (${user.points} points)\n`;
        
    });

    const embed = new EmbedBuilder()
        .setTitle(`Points Leaderboard (Page ${page + 1})`)
        .setDescription(lbString || "No more users.")
        .setColor('Blue');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lbprevious')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0), // Disable if on first page
        new ButtonBuilder()
            .setCustomId('lbnext')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(start + 10 >= data.users.length) // Disable if no more users
    );

    return { embeds: embed, components: row };
}

// Guessing game logic
async function startGuess(interaction, difficulty) {
    if (!interaction.memberPermissions.has('Administrator') && process.env.DISCORD_TOKEN === process.env.TEST_BOT_TOKEN) {
        return interaction.reply({ content: 'This is the testing bot for admins only. BEAT IT!', ephemeral: true });
    }

    if (activeChannels.includes(interaction.channel.id)) {
        return interaction.reply({ content: "There is a game currenlty active in this channel.", ephemeral: true });
    }

    await interaction.deferReply();

    const rawData = await fs.readFile('./levels.json', 'utf8');
    const data = JSON.parse(rawData);

    var filteredList = [];

    if (difficulty != "Any" && difficulty != undefined) {
        for (var i = 0; i < data.levels.length; i++) {

            var currentLevel = data.levels[i];
            if (currentLevel.difficulty === difficulty) {
                filteredList.push(currentLevel);
            }
        }
    } else {
        filteredList = data.levels
    }

    if (filteredList.length < 1) {
        return interaction.editReply({content: "The bot is not ready to be used yet, please wait for more levels to be added.", ephemeral: true });
    }

    var randomLevelIndex = Math.floor(Math.random() * filteredList.length)
    var randomLevel = filteredList[randomLevelIndex]

    // Figuring out what color the embed should be, probably a better way to do this
    var color = 'Gray';
    var reward = 0;
    if (randomLevel.difficulty === "Easy") {
        color = 'Green';
        reward = 1;
    } else if (randomLevel.difficulty === "Medium") {
        color = 'Yellow';
        reward = 2;
    } else {
        color = 'Red';
        reward = 3;
    }

    /* Adding your own difficulties: 
    1. In src/register-commands.js, in the add-level command, add the name of the difficulty to the difficulty choices list. Do the same to the guess command and edit-level commond under the difficulty choices. Once you've done these, run the register commands file with "node src/register-commands.js"
    2. The bit right above this note is changing the color of the embed and determining how much points you will get for each difficulty. To add your new difficulty, first change the hard difficulty conditional from "} else {" to "} else if (randomLevel.difficulty === "Hard") {"
    3. Now, add an else statement for your custom difficulty. It will look something like this:
    } else {
        color = 'Purple'; (or whatever you want it to be)
        reward = 5; (or whatever)
    }

    You dont need to put "else if (randomLevel.difficulty === "Expert")" because that is the only other option currently, that would only be necessary if you add another difficulty.
    */

    // Setting up the levels embed
    const embed = new EmbedBuilder().setTitle("What is the name of this level?").setImage(randomLevel.image).setColor(color).setFooter({ text: "Request levels to be added with /request-sparky"});

    // Sending the embed and starting the game
    await interaction.editReply({ embeds: [embed] });

    const filter = m => !m.author.bot;
    const collector = interaction.channel.createMessageCollector({
        filter,
        time: 15000
    });

    activeChannels.push(interaction.channel.id);
    var won = false

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('play-again')
            .setLabel('Play Again')
            .setStyle(ButtonStyle.Success)
    );

    const pointsRawData = await fs.readFile('./points.json', 'utf8');
    const pointsData = JSON.parse(pointsRawData);

    collector.on('collect', async m => {
        if (m.content.toLowerCase() === randomLevel.name.toLowerCase()) {
            
            won = true;
            collector.stop();

            let userProfile = pointsData.users.find(u => u.id === m.author.id);
            if (!userProfile) {

                pointsData.users.push({
                    id: m.author.id,
                    points: reward,
                    streak: 1
                });

                console.log("Added new player");
            } else {
                if (!userProfile.streak) {
                    userProfile.streak = 1;
                } else {
                    userProfile.streak += 1;
                }

                userProfile.points += reward;
            }

            // Getting streak image:
            var thumbnail = settingsData.images.correct;
            if (userProfile.streak >= 15) {
                thumbnail = settingsData.images.streak3;
            } else if (userProfile.streak >= 10) {
                thumbnail = settingsData.images.streak2;
            } else if (userProfile.streak >= 5) {
                thumbnail = settingsData.images.streak1;
            }


            const embed = new EmbedBuilder().setDescription(`The level was **${randomLevel.name}!** ${m.author} won! +${reward} points`).setFooter({ text: `Streak: ${userProfile.streak}`, iconURL: thumbnail});

            interaction.channel.send({ embeds: [embed], components: [row] });
            await fs.writeFile('./points.json', JSON.stringify(pointsData, null, 2));

        }
    });


    collector.on('end', async m => {
        var channelIndex = activeChannels.indexOf(interaction.channel.id);

        if (channelIndex !== -1) {
            activeChannels.splice(channelIndex, 1);
        }

        let userProfile = pointsData.users.find(u => u.id === interaction.user.id);

        if (won) { return; }

        var streakLostText = ``;
        if (userProfile.streak > 2) {
            streakLostText = `\n<@${interaction.user.id}>'s Streak of ${userProfile.streak} has been lost.`
        }
        interaction.channel.send({content: `**Times up!** 😂 ${streakLostText}`, components: [row]});
        userProfile.streak = 0;

        await fs.writeFile('./points.json', JSON.stringify(pointsData, null, 2));
    });
}

// Checking if this user has perms for this command
function hasPerms(interaction) {
    if (settingsData.managerRole != "") {
        return interaction.member.roles.cache.find(r => r.id === settingsData.managerRole);
    } else {
        return interaction.memberPermissions.has("Administrator");
    }
}

var statuses = settingsData.statuses // Getting statuses from settings.json. Feel free to add you own in there.

// Adding level count status (needs code which cant be done in .json files). I do not recommend adding your own status that has coding unless you have decent scripting knowledge.
const rawLevelData = await fs.readFile('./levels.json', 'utf8');
const levelData = JSON.parse(rawLevelData);

const levelCount = levelData.levels.length

statuses.push(
    {name: `Guess from ${levelCount} different levels!`, type: 3}
);

let currentStatus = 0;

client.on('clientReady', () => {
    console.log("Bot is online")
    setInterval(() => {
        const status = statuses[currentStatus];
        client.user.setPresence({
            activities: [{ name: status.name, type: status.type }],
            status: 'online'
        });
        currentStatus = (currentStatus + 1) % statuses.length;
    }, settingsData.statusInterval); // 
});

client.login(process.env.DISCORD_TOKEN);
