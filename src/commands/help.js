
/*
 *
 * A command that returns command usage information.
 *
 */

const CommandInterface = require("./commandPrototype.js").CommandInterface;
const config = require("../config/config.js").config;

class HelpCommand extends CommandInterface
{
	exec(args)
	{
		let listedCommands = {
			"help": `${config.commandPrefix} help [{command}]\n - Lists help for commands, like it is doing right now.`,
			"roll": `${config.commandPrefix} roll [{d=1d6}...]\n - Rolls dice or flips coins to give a random value.`,
			"trivia": `${config.commandPrefix} trivia [stop] [timer {seconds=30}] [rounds {numRounds=3}]\n - Runs a game of trivia, or stops an in-progress game if "stop" is passed.`,
			"test": `${config.commandPrefix} test\n - Tests the status of the bot. Lists the number of unreturned command processes (though some may continue running in a new thread).`
		};

		let helpStr = `Use "!syzbot help {command}" to see help about a particular command. Commands include:\n${Object.keys(listedCommands).join(", ")}`;

		if (args && args.length > 0)
		{
			const command = Object.keys(listedCommands).find((el) => { return args.includes(el); });

			if (command)
			{
				helpStr = listedCommands[command];
			}
		}

		return helpStr;
	}
}

exports.HelpCommand = HelpCommand;
