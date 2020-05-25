
/*
 *
 * A command that creates a timed reminder.
 *
 * TODO:
 * Backup reminders to per-room file in case of bot going down
 *
 */

const CommandInterface = require("./commandPrototype.js").CommandInterface;

class RemindCommand extends CommandInterface
{
	constructor()
	{
		super();

		// TODO:
		// We check our backup files for any expired reminders in case of bot going down

		this.m_eventEmitter = null;

		this.m_reminders = [];
	}

	exec(args, eventNotifier)
	{
		try
		{
			this.m_eventEmitter = eventNotifier;

			let command = args.shift().toLowerCase();

			if (command === "list")
			{
				return this.getReminderList();
			}
			else if (command === "add")
			{
				let reminder = this.processAddReminder(args);

				return `Reminder with ID ${reminder.id} set.`;
			}
			else if (command === "remove")
			{
				this.processRemoveReminder(args);

				return `Reminder(s) removed.`;
			}
			else
			{
				return "I don't understand this reminder command.";
			}

		}
		catch(e)
		{
			this.m_eventEmitter.emit("message.logError", "Reminder error: " + e);
			return "I don't understand this reminder command.";
		}
	}


	// Returns a string that lists the room's current reminders.
	getReminderList()
	{
		let reminderList;
		if (this.m_reminders.length > 0)
		{
			reminderList = "Pending reminders for this room: ";
			for (let reminder of this.m_reminders)
			{
				reminderList += `\n${reminder.id}:\n    Triggering at ${new Date(reminder.timeStamp)}\n    ${reminder.message}`;
			}
		}
		else
		{
			reminderList = "No reminders currently set.";
		}

		return reminderList;
	}


	// Attemps to add a new reminder based on argument string list
	processAddReminder(args)
	{
		if (args.length < 4)
		{
			throw "Invalid arguments list";
		}

		let reminder = {id: "", timeStamp: 0, message: "", timer: null};

		reminder.id = args[0];

		if (args[1].toLowerCase() === "on")
		{
			let date = Date.parse(args[2]);

			if (isNaN(date))
			{
				throw "Invalid date";
			}

			reminder.timeStamp = date.getTime();
		}
		else if (args[1].toLowerCase() === "after")
		{
			let time = this.parseTime(args[2]);

			if (time < 0)
			{
				throw "Invalid time";
			}

			reminder.timeStamp = Date.now() + time;
		}
		else
		{
			throw "Invalid datetime";
		}

		reminder.message = args.slice(3).join(' ');

		this.addReminder(reminder);

		return reminder;
	}


	// Adds a reminder
	addReminder(reminder)
	{
		this.m_reminders.push(reminder);

		let remainingTime = reminder.timeStamp - Date.now();
		if (remainingTime < 1)
		{
			this.executeReminder(reminder);
		}
		else
		{
			reminder.timer = setTimeout((r) => { this.executeReminder(r) }, remainingTime, reminder);
		}
	}


	// Parses a time string and returns a positive time in milliseconds or -1 on parse failed
	parseTime(timeStr)
	{
		let times = timeStr.split(':');

		if (!times || times.length < 1 || times.length > 3)
		{
			return -1;
		}

		let timeAccumulation = 0;

		// We support up to H:M:S and on date should be used for longer
		while (times.length > 0)
		{
			let time = parseInt(times.shift(), 10);

			if (isNaN(time))
			{
				return -1;
			}

			if (times.length === 2)
			{
				timeAccumulation += 1000 * 60 * 24 * time;
			}
			else if (times.length === 1)
			{
				timeAccumulation += 1000 * 60 * time;
			}
			else
			{
				timeAccumulation += 1000 * time;
			}
		}

		this.m_eventEmitter.emit("message.log", `${timeStr} = ${timeAccumulation}`);

		return timeAccumulation;
	}


	// Removes a reminder based on an arg string
	processRemoveReminder(args)
	{
		if (args.length == 0)
		{
			throw "No removal ID";
		}

		for (let reminder of this.m_reminders)
		{
			if (args.includes(reminder.id))
			{
				this.removeReminder(reminder);
			}
		}
	}


	// Removes a reminder
	removeReminder(reminder)
	{
		clearTimeout(reminder.timer);
		this.m_reminders.splice(this.m_reminders.indexOf(reminder), 1);
	}


	// Gives the reminder
	executeReminder(reminder)
	{
		this.m_eventEmitter.emit("message.dispatched", `REMINDER: ${reminder.message}`);
		this.m_reminders.splice(this.m_reminders.indexOf(reminder), 1);
	}
}

exports.RemindCommand = RemindCommand;
