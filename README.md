# How to set up your sparky bot:

## Step 1: Creating the App

Go to the [Discord Developer Portal](https://discord.com/developers/applications) Click on the New Application button on the top right of the page, and name it whatever you want.
Go to the Bot tab and check all of these:
<img width="2129" height="480" alt="image" src="https://github.com/user-attachments/assets/5a9006d5-9b29-42fa-b845-27307a83a615" />


You may have noticed it won't let you turn off public bot. To fix this, go to installation, under install link select 'None'. Now you can go back and make it private.
Now, to add your bot, go to the **OAuth2** section. Under OAuth2 URL Generaton, find and check the bot button.
<img width="2029" height="866" alt="image" src="https://github.com/user-attachments/assets/2294c39a-4006-4b70-9064-f53040bab610" />

In Bot permissions, you can just check administrator (unless you don't trust this source code for some reason). At the very bottom of the screen, in **Generated URL** there will be a URL you can type into your browser that will let you add the bot to a server.

## Step 2: Set up Discord.js stuff

Download the files for the bot and open them in VSCode (or whatever you prefer), the discloud.config file is only needed if you plan on using [Discloud](https://discloud.com) to host the bot. Now, follow this page of instructions on the [official discord.js instructions](https://discordjs.guide/legacy/preparations/installation)

Now, you should have a couple new files added to the folder, such as package.json, package-lock.json, and the node_modules folder whole folder. Inside the package.json file, set "main" to **src/index.js**. Now, **npm install discord.js dotenv** in a terminal. Once it is complete, make a new file in the root of the project (outside of any folders) called **.env**
Inside the file, you will need to add some variables in it.
```
DISCORD_TOKEN=(YOUR TOKEN HERE)
GUILD_ID=(ID OF YOUR DISCORD SERVER)
CLIENT_ID=(YOUR BOTS ID. THIS CAN BE FOUND IN THE GENERAL INFORMATION TAB ON THE DEVELOPER PORTAL)
TEST_BOT_TOKEN=(THE TOKEN OF YOUR TESTING BOT IF YOU HAVE ONE. IF YOU DONT HAVE ONE, JUST PUT NONE HERE)
```
Make sure to format the file exactly how I did here; no spaces, no quotation marks, and type the variable names in all caps.

To find your bot's token ID, go back to the [Developer Portal](https://discord.com/developers/applications), go to your bot, click on the bot tab and press **Reset Token**. DO NOT SHOW THIS TO ANYBODY OR THEY COULD HACK INTO YOUR BOT!!! When you put this into your .env file, do not put quotations around it or anything.

Now we have to register the slash commands. Open a new terminal and type **node src/register-commands.js**. Wait until it says "registered" in the output.

## Step 3: Hosting
There are 2 ways to do this:
1. Local hosting
2. External hosting

### Local hosting (free, only recommended if your computer will never lose internet or crash):
1. Open a new terminal and type **npm install --save-dev nodemon**.
2. Now, run **nodemon**. Make sure you set the main file in package.json to src/index.js.
3. [This Video](https://youtu.be/KZ3tIGHU314?list=PLpmb-7WxPhe0ZVpH9pxT5MtC4heqej8Es&t=740) at this timestamp explains how to do it better than me.

### External hosting with Discloud (supposed to be free but it might not let you because of too many or something, if this happens the paid plans are as cheap as $2 USD):
1. Make a zip file of your bot
2. After you log in to [Discloud](https://discloud.com) with discord, click your profile picture and press dashboard
3. Press upload and then upload the zip file of your bot files you just made. This didn't go very smooth sailing when I did it so I just went to my app, pressed explorer, and just added all the files manually as there aren't too many.
4. If there are any issues, you can either join the discloud discord server or dm me on discord (@mcdonda).

## Support:
To be alerted for updates, join the [McGDPS](https://discord.gg/NDZ6Te7eaw) discord server. Either get the Sparky Updates notification role during onboarding, follow the #sparky-updates channel, or both. Only important updates will be pinged and announced, so don't worry about that.

PLEASE let me know if there is anything missing from these instructions on discord (@mcdonda).

# How to Use the Bot:
## Settings.json
There is a file called settings.json. In this file (as of 2/15/2026) there are only 2 settings: allowedChannels and requestChannel.
1. allowedChannels: In here, put the ids of the channels you want the guessing to be allowed in, format like this: ["channel id 1", "channel id 2"]. If you want it to be playable in all channels, just leave this empty.
2. requestChannel (required): Put the id of the channel that you want level requests to be forwarded to. Currently the level request system is in beta so expect imporvements to the level adding process soon.
   
## Playing the game:
Just use /guess, just like the original sparky.

## Requesting levels to be added:
Tell your server about the /request-sparky command. If you set the requestChannel in settings, when people use this command it will send a message to the specified channel with the name and image the user must provide.

## Adding levels
Eventually a button to accept requests directly on the message will be added to make accepting requested levels easier.
To add levels, use the /add-level command. Everything is pretty straight forward accept for adding the images which may be a bit confusing. If you are adding the image from a discord message, make sure to copy the image link **from a message that will never be deleted** and copy it like this:
<img width="787" height="541" alt="image" src="https://github.com/user-attachments/assets/d9b0e016-00b4-4ed8-b6ea-c501b44de346" />

There are some other commands but its pretty easy to figure out what they do. More will be added soon, like a command to correct/remove levels. At the moment, you have to go into the levels.json file and make the changes in there directly.
