
/*
 *
 *  A command that starts a trivia game.
 *
 *  Data provided by Open Trivia Database (https://opentdb.com) by PIXELTAIL GAMES LLC,
 *    under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0).
 *
 */

const https = require("https");

const CommandInterface = require("./commandPrototype.js").CommandInterface;
const shuffleArray = require("../utility/arrayUtils.js").shuffle;


class TriviaCommand extends CommandInterface
{
	constructor()
	{
		super();

		// Whether this room has a trivia game running or not
		this.gameStarted = false;
		// The JSON object fetched from the database containing questions and answers.
		this.m_triviaQuestions = {};
		// An object holding a player id, name, and score. We use a map to iterate over the object.
		// The map value is an object with a int "score", [] "roundsWon", and bool "correctCurrent" properties
		this.m_players = new Map();
		// The current question index for our event listener to read
		this.m_currentIndex = 0;
		// The letter indicator for the current correct answer (so user can use it as their choice)
		this.m_currentCorrectLetter = 'a';

		this.eventEmitter = null;

		// Wraps m_readTriviaInput so that we can preserve the correct "this"
		// messageObject is an object with "senderID", "senderName", "message" properties
		this.onMessageCallback = (messageObject) => {this.m_readTriviaInput(messageObject);};

		// Defaults for argument configurable settings
		this.argValues = {
			"shouldStop": false,
			"timerDurationMS": 30000,
			"rounds": 3,
			"triviaType": "",
			"triviaDifficulty": ""
		}

		this.licenseString = "Data provided by Open Trivia Database (https://opentdb.com) by PIXELTAIL GAMES LLC, under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0)";
	}


	exec(args, eventNotifier)
	{
		this.eventEmitter = eventNotifier;
		this.m_processArgs(args);

		if (this.argValues.shouldStop)
		{
			if (this.gameStarted)
			{
				this.m_endGame();
				return "";
			}
			else
			{
				return "There is no started trivia game to stop.";
			}
		}

		this.m_startGame(args);
		return "";
	}


	// Processes an argument list
	m_processArgs(args)
	{
		// We don't need anything case sensitive, so convert
		// to make it easier to be case insensitive
		let argsLower = [...args];
		for(let i = 0; i < argsLower.length; ++i)
		{
			if (typeof(argsLower[i]) === "string")
			{
				argsLower[i] = argsLower[i].toLowerCase();
			}
		}

		if (argsLower.includes("stop"))
		{
			this.argValues.shouldStop = true;

			// None of the other arguments matter if we are stopping, so return
			return;
		}

		if (argsLower.includes("timer"))
		{
			// Timer accepts a number defining the time of a round in seconds
			let i = argsLower.indexOf("timer");
			if (i+1 < argsLower.length)
			{
				let timeVal = parseInt(argsLower[i+1], 10);
				if (timeVal && !isNaN(timeVal) && timeVal > 0)
				{
					this.argValues.timerDurationMS = timeVal * 1000;
				}
			}
		}

		if (argsLower.includes("rounds"))
		{
			// Rounds accepts a number defining the number of rounds
			let i = argsLower.indexOf("rounds");
			if (i+1 < argsLower.length)
			{
				let roundsVal = parseInt(argsLower[i+1], 10);
				if (roundsVal && !isNaN(roundsVal) && roundsVal > 0)
				{
					this.argValues.rounds = roundsVal;
				}
			}
		}

		if (argsLower.includes("type"))
		{
			let i = argsLower.indexOf("type");
			if(i+1 < argsLower.length)
			{
				if (["AT,TF,MC"].includes(argsLower[i+1]))
				{
					this.argValues.triviaType = {
						"at": "",
						"tf": "boolean",
						"mc": "multiple"
					}[argsLower[i+1]];
				}
			}
		}

		if (argsLower.includes("difficulty"))
		{
			let i = argsLower.indexOf("difficulty");
			if (i+1 < argsLower.length)
			{
				this.argValues.triviaDifficulty = {
					"any": "",
					"easy": "easy",
					"medium": "medium",
					"hard": "hard"
				}[argsLower[i+1]];
			}
		}
	}


	// Starts a new trivia game if not already started
	m_startGame()
	{
		if (this.gameStarted)
		{
			this.eventEmitter.emit("message.dispatched", "Trivia game is already in progress!");
			return;
		}

		// We don't need to initialize everything since currently a game will only ever run once.
		this.gameStarted = true;

		this.m_fetchTriviaData(() => {
			try
			{
				this.eventEmitter.emit("message.dispatched",
					`Starting Trivia Game. ${this.licenseString}.\n${this.m_triviaQuestions.length} rounds, ${this.argValues.timerDurationMS / 1000} seconds per round.`
				);

				this.m_players.clear();
				this.m_currentIndex = 0;
				this.eventEmitter.on("message.recieved", this.onMessageCallback);

				this.m_iterateRounds(0);
			}
			catch(e)
			{
				this.eventEmitter.emit("message.dispatched", "An error occured, canceling trivia game.");
				this.eventEmitter.emit("message.logError", "Trivia error: " + e);

				this.gameStarted = false;
			}
		}, (errorMessage) => {
			this.eventEmitter.emit("message.dispatched", "Cannot start trivia game: " + errorMessage);

			this.gameStarted = false;
		});
	}


	// Iterates through the trivia questions in a recursive fashion
	m_iterateRounds(index)
	{
		if (!this.gameStarted)
		{
			return;
		}

		// End the previous round
		if (index > 0)
		{
			this.m_endRound(index-1);
		}
		if (index >= this.m_triviaQuestions.length)
		{
			this.m_endGame();
			return;
		}

		// For the emitter callback to read, because it can't just store selections
		// unless it knows what the options are
		this.m_currentIndex = index;

		this.m_startRound(index);

		// Make sure to wrap our func in an arrow func to preserve "this"
		// We give a 500ms extra on timer because of message transmission lag.
		setTimeout((index) => {this.m_iterateRounds(index);}, this.argValues.timerDurationMS + 500, index+1);
	}


	// Begins a round of trivia with a new question
	m_startRound(index)
	{
		if (index >= this.m_triviaQuestions.length)
		{
			return;
		}
		const current = this.m_triviaQuestions[index];
		let answers = [...current.incorrect_answers, current.correct_answer];
		shuffleArray(answers);

		// The API doesn't specify how many answers can be in a multiple choice.
		// For now assume no more than 4 I guess...
		const prepend = ['a', 'b', 'c', 'd'];

		let currentStr = `${index} | ${current.category} : ${current.difficulty} difficulty\n${current.question}`;
		for (let i = 0; i < answers.length && i < prepend.length; ++i)
		{
			currentStr += `\n  ${prepend[i]}. ${answers[i]}`;

			if (answers[i] == current.correct_answer)
			{
				this.m_currentCorrectLetter = prepend[i];
			}
		}

		this.eventEmitter.emit("message.dispatched", currentStr);
	}


	// Ends a round of trivia, incrementing scores
	m_endRound(index)
	{
		let scoredPlayers = [];

		// Add score to players who have the correct
		for(let [playerID, player] of this.m_players)
		{
			if (player.correctCurrent)
			{
				++player.score;
				player.roundsWon.push(index);

				// Just resetting here is probably too messy...
				player.correctCurrent = false;

				scoredPlayers.push(player.name);
			}
		}

		let scoredPlayerStr = "";
		if (scoredPlayers.length > 0)
		{
			scoredPlayerStr = ` A point goes to ${scoredPlayers.join(", ")}.`;
		}

		let roundStr = `Round ${index} ended. The correct answer was "${this.m_currentCorrectLetter}". ${this.m_triviaQuestions[index].correct_answer}.` + scoredPlayerStr;

		this.eventEmitter.emit("message.dispatched", roundStr);
	}


	// Checks a message as a possible trivia response
	//   and records the selection for later if so.
	//  This causes us to have to store a lot more stuff in class than I would like,
	//    since it is triggered by external event.
	m_readTriviaInput(messageObject)
	{
		if (!this.gameStarted)
		{
			this.eventEmitter.emit("message.logError", "Trivia game tried to read message while game wasn't running!");
			return;
		}

		let answerMatch = new RegExp(
			`^(?:(?:${this.m_currentCorrectLetter}[.]??)|(?:(?:${this.m_currentCorrectLetter}[.]?? ??)??${this.m_triviaQuestions[this.m_currentIndex].correct_answer}))$`,
		"i");

		// For now, we just select a player's most recent choice within the round
		if(answerMatch.test(messageObject.message.trim()))
		{
			// For now we only keep track of a player once they are worth
			//   keeping track of, since not all chatters will play and we don't need to
			if (!this.m_players.has(messageObject.senderID))
			{
				this.m_players.set(messageObject.senderID, {
					"name": messageObject.senderName,
					"score": 0,
					"roundsWon": [],
					"correctCurrent": false
				});
			}

			this.m_players.get(messageObject.senderID).correctCurrent = true;
		}
		else
		{
			if (this.m_players.has(messageObject.senderID))
			{
				this.m_players.get(messageObject.senderID).correctCurrent = false;
			}
		}
	}


	// Ends a game of trivia, returning the results
	m_endGame()
	{
		this.eventEmitter.removeListener("message.recieved", this.onMessageCallback);
		this.gameStarted = false;

		// Find out who had the highest score since players aren't sorted (could be more than one player)
		let winnerStr = "";
		if (this.m_players.size > 0)
		{
			let winners = [];
			let scoreToBeat = -1;
			for (let [playerID, player] of this.m_players)
			{
				if (player.score > scoreToBeat)
				{
					winners = [player.name];
					scoreToBeat = player.score;
				}
				else if (player.score == scoreToBeat)
				{
					winners.push(player.name);
				}
			}

			winnerStr = ` Winner(s): ${winners.join(", ")} with ${scoreToBeat} points.`;
		}

		let gameStr = "Trivia Game concluded." + winnerStr;

		this.eventEmitter.emit("message.dispatched", gameStr);
	}


	// Fetches JSON question data with AJAX
	m_fetchTriviaData(onComplete, onError)
	{
		let dataURL = `https://opentdb.com/api.php?amount=${this.argValues.rounds}`;
		if (this.argValues.triviaDifficulty)
		{
			dataURL += `&difficulty=${this.argValues.triviaDifficulty}`;
		}
		if (this.argValues.triviaType)
		{
			dataURL += `&type=${this.argValues.triviaType}`;
		}

		// Since we are using node, XHR requires a package
		// so I'll just use Node's https module...
		https.get(dataURL, (response) => {
			let data = "";

			response.on("data", (chunk) => {
				data += chunk;
			});

			response.on("end", () => {
				let jsonData = JSON.parse(decodeURIComponent(data));

				if (jsonData.response_code == 0)
				{
					this.m_triviaQuestions = jsonData.results;
					onComplete();
				}
				else
				{
					onError("Trivia API error.");
					this.eventEmitter.emit("message.logError", "Trivia API error: " + jsonData);
				}
			});
		}).on("error", (e) => {
			onError("Trivia API not available.");
			this.eventEmitter.emit("message.log", "Trivia API not available: " + e.message);
		});

		this.eventEmitter.emit("message.log", `Fetching data from '${dataURL}'`);
	}
}


exports.TriviaCommand = TriviaCommand;

