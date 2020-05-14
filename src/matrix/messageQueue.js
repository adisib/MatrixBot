
/*
 *
 * A queue for message sending to guarantee synchronous messages.
 *
 */

class MessageQueue
{
	// client is the MatrixClient from the matrix-js-bot-sdk to send messages
	// roomID is the id of the room that we are sending messages to
	constructor(client, roomID)
	{
		this.client = client;
		this.roomID = roomID;
		this.queue = [];
		this.m_queueIsFlushing = false;
	}

	// Enqueues a message for sending. The message is a json object representing a matrix message.
	// Cannot be dequeued, as the message could be sent immediately.
	// May introduce latency proportional to remaining queue size.
	enqueue(message)
	{
		// TODO TEMP DEBUG LINE
		this.queue.push(message);
		this.m_flushQueue(true);
	}

	// Sends messages out of the queue in a recursive fashion
	m_flushQueue(/*bool*/ isInitiating)
	{
		if (isInitiating && this.m_queueIsFlushing)
		{
			// Flush has already been initiated
			return;
		}

		if (this.queue.length === 0)
		{
			this.m_queueIsFlushing = false;
			return;
		}

		this.m_queueIsFlushing = true;

		let message = this.queue.shift();
		this.client.sendMessage(this.roomID, message).then(() => { this.m_flushQueue(false); });
	}
}


exports.MessageQueue = MessageQueue;
