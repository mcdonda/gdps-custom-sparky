import * as dotenv from 'dotenv';
dotenv.config();

import { REST, Routes, ApplicationCommandOptionType } from 'discord.js';

console.log("Token Loaded:", process.env.DISCORD_TOKEN ? "YES" : "NO");
console.log("Client ID:", process.env.CLIENT_ID);

const commands = [
    {
        name: "add-level",
        description: "(Admin Only) Add a level that can show up when playing",
        options: [
            {
                name: "level-name",
                description: "Make sure to capatalize correctly",
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: "image",
                description: "Image URL, make sure it is from a message that won't be deleted.",
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: "difficulty",
                description: "Easy, Medium, or Hard",
                type: ApplicationCommandOptionType.String,
                choices: [
                    {
                        name: "Easy",
                        value: "Easy"
                    },
                    {
                        name: "Medium",
                        value: "Medium"
                    },
                    {
                        name: "Hard",
                        value: "Hard"
                    }
                ],

                required: true
            }
        ],
    },
    {
        name: "guess",
        description: "Start the guessing game!",
        options: [
            {
                name: "difficulty",
                description: "If none selected then it can be any difficulty",
                type: ApplicationCommandOptionType.String,
                choices: [
                    {
                        name: "Easy",
                        value: "Easy"
                    },
                    {
                        name: "Medium",
                        value: "Medium"
                    },
                    {
                        name: "Hard",
                        value: "Hard"
                    }
                ]
            }
        ]
    },
    {
        name: "points",
        description: "See how many McGDPS Sparky points you have",
        options: [
            {
                name: "user",
                description: "Who's points you want to display, you by default",
                type: ApplicationCommandOptionType.User
            }
        ]
    },
    {
        name: "levels-list",
        description: "(Admins Only) See a list of all possible levels"
    },
    {
        name: "points-leaderboard",
        description: "View the leaderboard for the McGDPS Sparky points"
    },
    {
        name: "request-sparky",
        description: "Request a level to be added to the McGDPS Sparky.",
        options: [
            {
                name: "level-name",
                description: "Please provide the correct capatalization",
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: "image",
                description: "The screen shot that will be seen by players",
                type: ApplicationCommandOptionType.Attachment,
                required: true
            }
        ]
    }
];

const rest = new REST({ version: 10 }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('registering slash commands');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        )

        console.log('registered');
    } catch (error) {
        console.log(error);
    }
})();