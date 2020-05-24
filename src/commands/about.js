
/*
 *
 * A command that returns an about information string.
 *
 */

const config = require("../config/config.json");

const CommandInterface = require("./commandPrototype.js").CommandInterface;

class AboutCommand extends CommandInterface
{
	exec()
	{
		return `${config.botName} is a personal bot that can do a few random things. Use "${config.commandPrefix} help" to see what commands are available.`;
	}
}

exports.AboutCommand = AboutCommand;
