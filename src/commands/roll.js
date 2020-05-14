
/*
 *
 * A command that generates random values through dice rolls.
 *
 */


const CommandInterface = require("./commandPrototype.js").CommandInterface;

class RollCommand extends CommandInterface
{
	exec(args)
	{
		try
		{
			let rolls = this.m_processArgs(args);
			let results = this.m_rollAll(rolls);

			if (results.length > 1)
			{
				return `Your results: ${results.join(", ")} (total of ${results.reduce((a,c) => {return a+c;})})`;
			}
			else
			{
				return `Your result: ${results[0]}`;
			}
		}
		catch(e)
		{
			// TODO: Select randomly from multiple error message variations?
			return "I don't know how to roll that.";
		}
	}


	// Returns a list of objects representing rolls of a die, {"number", "sides"}
	m_processArgs(args)
	{
		// Default to a 1d6 roll
		if (!args || args.length === 0)
		{
			args = ["1d6"];
		}

		let rolls = [];

		for (let arg of args)
		{
			let params = arg.split('d');
			if (params.length !== 2)
			{
				throw "Invalid argument";
			}

			let num = parseInt(params[0], 10);
			let sides = parseInt(params[1], 10);

			if ((!num || isNaN(num)) || (!sides || isNaN(sides)))
			{
				throw "Invalid argument";
			}

			rolls.push({"number": num, "sides": sides});
		}

		return rolls;
	}


	// Rolls a die a number of times, returning the rolled values
	m_roll(numRolls, sides)
	{
		if (sides < 2)
		{
			throw "Must throw a two dimensional object.";
		}

		let results = [];

		for (let i = 0; i < numRolls; ++i)
		{
			results.push(Math.floor(Math.random() * (sides - 1) + 1));
		}

		return results;
	}


	// Rolls a series of different dice each a number of times, returning the rolled values
	// Takes a list of objects representing the rolls of a die, {"number", "sides"}
	m_rollAll(dice)
	{
		let results = [];

		for (let die of dice)
		{
			results = results.concat(this.m_roll(die.number, die.sides));
		}

		return results;
	}
}

exports.RollCommand = RollCommand;
