import 'dotenv/config';
import settingsData from './settings.json' with { type: 'json' };

import { Client, GatewayIntentBits, IntentsBitField, EmbedBuilder, Message, ActionRowBuilder, ButtonStyle, ButtonBuilder } from 'discord.js';


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

        if (!interaction.memberPermissions.has('Administrator')) {
            return interaction.reply({ content: 'Admin only command', ephemeral: true });
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
        if (!interaction.memberPermissions.has('Administrator')) {
            return interaction.reply({ content: 'Admins only.', ephemeral: true });
        }

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

        var lbString = "";
        const rawData = await fs.readFile('./points.json', 'utf8');
        const data = JSON.parse(rawData);

        var orderedList = Object.values(data.users).map(user => ({
            id: user.id,
            points: user.points
        }));

        orderedList.sort((a,b) => b.points - a.points);

        for (let u in orderedList) {
            if (u > 10) {break;}

            lbString += `${u+1}. <@${orderedList[u].id}> - **${orderedList[u].points}** points\n`;
        }

        const embed = new EmbedBuilder().setTitle("Top Points Leaderboard:").setDescription(lbString).setColor('DarkBlue');
        await interaction.reply({ embeds: [embed] });
    }

    // Requesting levels to be added
    if (interaction.commandName === "request-sparky") {
        const levelName = interaction.options.getString('level-name');
        const image = interaction.options.getAttachment('image');

        interaction.reply({ content: `Request sent for **${levelName}**`, ephemeral: true });

        const channel = settingsData.requestChannel

        const embed = new EmbedBuilder().setTitle(`Level Name: ${levelName}`).setImage(image?.url || null).setDescription(`Request sent from <@${interaction.user.id}>`).setColor('Fuchsia');
        await channel.send({ content: "New Sparky Level Request", embeds: [embed] });
    }

    if (interaction.customId === "play-again") {
        startGuess(interaction, "Any");
    }
});

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

// Guessing game logic
async function startGuess(interaction, difficulty) {
    if (!interaction.memberPermissions.has('Administrator') && process.env.DISCORD_TOKEN === process.env.TEST_BOT_TOKEN) {
        return interaction.reply({ content: 'This is the testing bot for admins only. BEAT IT!', ephemeral: true });
    }

    if (activeChannels.includes(interaction.channel.id)) {
        return interaction.reply({ content: "There is a game currenlty active in this channel.", ephemeral: true })
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

    var randomLevelIndex = Math.floor(Math.random() * filteredList.length)
    var randomLevel = filteredList[randomLevelIndex]

    // Figuring out what color the embed should be, probably a better way to do this
    var color = 'Gray';
    var reward = 0;
    if (randomLevel.difficulty === "Easy") {
        color = 'Green';
        reward = 1;
    } else if (randomLevel.difficulty === "Medium") {
        color = 'Orange';
        reward = 2;
    } else {
        color = 'Red';
        reward = 3;
    }

    // Setting up the levels embed
    const embed = new EmbedBuilder().setTitle("What is the name of this level?").setImage(randomLevel.image).setColor(color);

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

    collector.on('collect', async m => {
        if (m.content.toLowerCase() === randomLevel.name.toLowerCase()) {
            const embed = new EmbedBuilder().setDescription(`The level was **${randomLevel.name}!** ${m.author} won! +**${reward}** points`)

            interaction.channel.send({ embeds: [embed], components: [row] });
            won = true;
            collector.stop();

            const pointsRawData = await fs.readFile('./points.json', 'utf8');
            const pointsData = JSON.parse(pointsRawData);

            let userProfile = pointsData.users.find(u => u.id === m.author.id);
            if (!userProfile) {

                pointsData.users.push({
                    id: m.author.id,
                    points: reward
                });

                console.log("Added new player");
            } else {
                userProfile.points += reward;
            }

            await fs.writeFile('./points.json', JSON.stringify(pointsData, null, 2));

        }
    });


    collector.on('end', m => {
        var channelIndex = activeChannels.indexOf(interaction.channel.id);

        if (channelIndex !== -1) {
            activeChannels.splice(channelIndex, 1);
        }


        if (won) { return; }
        interaction.channel.send({content: `**Times up!** 😂`, components: [row]});

    });
}
client.on('clientReady', () => {
    console.log("Bot is online")
});

client.login(process.env.DISCORD_TOKEN);