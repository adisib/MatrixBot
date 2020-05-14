
/*
 *
 * A command that returns an about information string.
 *
 */

const CommandInterface = require("./commandPrototype.js").CommandInterface;
const config = require("../config/config.js").config;

class AboutCommand extends CommandInterface
{
	exec()
	{
		return `${config.botName} is a personal bot that can do a few random things. Use "${config.commandPrefix} help" to see what commands are available.`;
	}
}

exports.AboutCommand = AboutCommand;
