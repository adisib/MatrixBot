
/*
 * Matrix interface for the bot.
 *
 * TODO:
 * Allow commands to have a power level requirement.
 * Switch to typescript because typescript is just better.
 *
 */


// --- Require ---

const MatrixBotSdk = require("matrix-bot-sdk");
const MatrixClient            = MatrixBotSdk.MatrixClient;
const SimpleFsStorageProvider = MatrixBotSdk.SimpleFsStorageProvider;
const LogService              = MatrixBotSdk.LogService;
const LogLevel                = MatrixBotSdk.LogLevel;
const ProfileCache            = MatrixBotSdk.ProfileCache;
const RichConsoleLogger       = MatrixBotSdk.RichConsoleLogger;
const AutojoinRoomsMixin      = MatrixBotSdk.AutojoinRoomsMixin;

const config = require("../config/config.js").config;
const matrixConfig = require("../config/config.js").matrixConfig;
const CommandHandler = require("../commandHandler.js").CommandHandler;
const MessageQueue = require("./messageQueue.js").MessageQueue;

class MatrixBot
{
	constructor()
	{
		this.started = false;

		this.m_storage = new SimpleFsStorageProvider("../storage/bot.json");
		LogService.setLogger(new RichConsoleLogger());
		LogService.setLevel(LogLevel.INFO);

		this.m_client = new MatrixClient(matrixConfig.homeServerURL, matrixConfig.accessToken, this.m_storage);
		AutojoinRoomsMixin.setupOnClient(this.m_client);

		this.m_botID = "";
		this.m_client.getUserId().then((userID) => {
			this.m_botID = userID;
			LogService.info("matrixBot.js", `${config.botName} running as ${this.m_botID}`);
		});

		// Our commands can have state, and our commandHandler references a command instance
		//   so we want to have a separate commandHandler for each room
		// Our commandHandler list gets lazily populated.
		this.m_commandHandlerList = {};

		// Each room gets a separate message queue, so that rooms can have synchronous messages
		// without blocking others
		this.m_messageQueueList = {};

		// We pass display names to commandHandler message events, so we want to cache that value
		//   to avoid additional latency in command processing.
		// This cache is shared by rooms, so we may want to have a high maximum number of entries.
		this.m_profileCache = new ProfileCache(50, 5 * 60 * 1000);
		this.m_profileCache.watchWithClient(this.m_client);
	}


	start()
	{
		if (this.started)
		{
			LogService.warn("matrixBot.js", "Tried to start the matrix client when already started!");
			return;
		}
		this.started = true;

		this.m_client.on("room.message", (roomID, roomEvent) => {
			try {
				if (!roomEvent.content || roomEvent.isRedacted)
				{
					return;
				}

				// For now, we only want to look at text events?
				if (roomEvent.content.msgtype !== "m.text" || roomEvent.sender === this.m_botID)
				{
					return;
				}

				// We spawn the room's command handler on demand because it is simpler
				if (this.m_commandHandlerList[roomID] === undefined)
				{
					this.m_commandHandlerList[roomID] = new CommandHandler();
					let commandHandler = this.m_commandHandlerList[roomID];

					// Sometimes a running command might want to send messages during activity
					// so we listen for a dispatched message from the command handler to send.
					// See the commandHandler class for details.
					commandHandler.messageNotifier.on("message.dispatched", (message) => {
						this.m_sendCommandMessage(roomID, message);
					});
					commandHandler.messageNotifier.on("message.log", (message) => {
						this.m_logCommandMessage(roomID, message);
					});
					commandHandler.messageNotifier.on("message.logError", (message) => {
						this.m_logCommandErrorMessage(roomID, message);
					});
				}

				this.m_processRoomMessage(roomID, roomEvent);
			}
			catch(e)
			{
				// Don't send a message to user because we don't know if we were supposed to respond.
				LogService.error("Failed to process client message.", e);
			}
		});

		this.m_client.start().then( () => {
			//botID = this.m_client.getUserId();

			LogService.info("matrixBot.js", "***** --- Client Sync Started! --- *****");
		});
	}


	m_logCommandMessage(roomID, /*string*/ message)
	{
		LogService.info(`Command from Room ${roomID}`, message);
	}


	m_logCommandErrorMessage(roomID, /*string*/ message)
	{
		LogService.error(`Command from Room ${roomID}`, message);
	}


	m_sendCommandMessage(roomID, /*string*/ message)
	{
		// this.m_client.sendNotice(roomID, message).then(() => {LogService.info("SENT MESSAGE", `Sent message: "${messagePartDebug}"`)});

		// We just create the room's message queue on-demand because it is simpler
		if (!this.m_messageQueueList[roomID])
		{
			this.m_messageQueueList[roomID] = new MessageQueue(this.m_client, roomID);
		}
		this.m_messageQueueList[roomID].enqueue({
			"msgtype": "m.notice",
			"body": message
		});
	}


	// Gets the display name of a userId, since the SDK doesn't provide a function for this
	async m_getDisplayName(userID)
	{
		const profile = await this.m_profileCache.getUserProfile(userID);
		let name = profile.displayName;
		if (!name)
		{
			// Pull from user ID if a display name isn't set
			name = userID.split(':')[0].substring(1);
		}

		return name;
	}


	// Processes a room message to check for commands and notify commands of messages
	async m_processRoomMessage(roomID, roomEvent)
	{
		const commandHandler = this.m_commandHandlerList[roomID];
		const body = roomEvent.content.body;

		try
		{
			if (commandHandler.isCommand(body))
			{
				// To inform that the bot is currently processing your command?
				this.m_client.sendReadReceipt(roomID, roomEvent.event_id);

				let replyBody = await commandHandler.processCommand(body);
				if (replyBody)
				{
					this.m_client.sendNotice(roomID, replyBody);
				}
			}
			else
			{
				commandHandler.messageNotifier.emit("message.recieved", {
					"senderID":   roomEvent.sender,
					"senderName": await this.m_getDisplayName(roomEvent.sender),
					"message":    body
				});
			}
		}
		catch(e)
		{
			LogService.error("Failed to process command.", e);

			// We want to send a rich reply so it is clear which command is being responded to.
			this.m_client.replyNotice(roomID, roomEvent, "There was an error processing your command.");
		}
	}
}

exports.MatrixBot = MatrixBot;

