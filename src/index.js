
/*
 * Bot entry point.
 *
 */

let config = require("./config/config.js").config;
let MatrixBot = require("./matrix/matrixBot.js").MatrixBot;

const bots = {
	"Matrix": MatrixBot
}

let bot = new bots[config.botType]();
bot.start();

