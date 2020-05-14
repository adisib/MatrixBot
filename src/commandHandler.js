

/*
 *
 * Parses a command string to dispatch actions for commands.
 *
 * TODO:
 * Allow adding command aliases conviniently.
 *
 */

const EventEmitter = require("events");

const config = require("./config/config.js").config;

const AboutCommand = require("./commands/about.js").AboutCommand;
const HelpCommand = require("./commands/help.js").HelpCommand;
const RollCommand = require("./commands/roll.js").RollCommand;
const TriviaCommand = require("./commands/trivia.js").TriviaCommand;


class CommandHandler
{
	constructor()
	{
		this.commandPrefix = config.commandPrefix;
		this.processes = 0;

		// The message notifier serves as a communication bridge between
		//   actions and the bot platform.
		// "message.recieved" indicates a message the client recieves for actions to handle
		// "message.dispatched" indicates a message for the bot to send out to the platform
		// "message.log" indicates a message to be logged
		// "message.logError" indicates an error message to be logged
		this.messageNotifier = new EventEmitter();

		// Some small actions that are built into the command handler
		this.m_builtinActions = {
			"null": {
				"exec": () => {
					return `Cmd? ("${this.commandPrefix} help" to list commands.)`;
				}
			},
			"test": {
				"exec": () => {
					return `${config.botName} is running with ${this.processes - 1} other room processes.`;
				}
			}
		}

		this.m_actions = {
			"":       this.m_builtinActions["null"],
			"test":   this.m_builtinActions["test"],
			"about":  new AboutCommand(),
			"help":   new HelpCommand(),
			"roll":   new RollCommand(),
			"trivia": new TriviaCommand()
		}
	}


	isCommand(/*string*/ commandString)
	{
		return commandString.startsWith(this.commandPrefix);
	}


	async processCommand(/*string*/ commandString)
	{
		commandString = commandString.trim();

		if (!this.isCommand(commandString))
		{
			throw "Tried to process non-command string as a command.";
		}

		// Note that an action could return but continue working asynchronously
		//   in which case the process count will not be accurate.
		++this.processes;
		try
		{
			let response = "Unable to process command.";

			let args = commandString.slice(this.commandPrefix.length).trim().split(/\s+/);
			let command = args.splice(0, 1)[0].toLowerCase();
			response = this.m_actions[command].exec(args, this.messageNotifier);

			return response;
		}
		catch(e)
		{
			throw e;
		}
		finally
		{
			--this.processes;
		}
	}
}


exports.CommandHandler = CommandHandler;
