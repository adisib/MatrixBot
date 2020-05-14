
/*
 *
 *  Interface for a command.
 *  Javascript isn't meant for this virtualized function call stuff though.
 *
 */

class CommandInterface
{
	// Performs the command action and returns a response string for the user.
	// It may choose to listen to non-command messages though the messageNotifier
	//   or emit a message to send using the same notifier.
	exec(/*string[]*/ args, /*EventEmitter*/ messageNotifier)
	{
		return "";
	}
}

exports.CommandInterface = CommandInterface;
