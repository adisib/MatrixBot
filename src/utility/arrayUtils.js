
/*
 *
 * Includes some utility functions for arrays.
 *
 */


// Shuffles an array.
// Input is modified, does not return a new array.
function shuffle(arr)
{
	// TODO: Check input type and stuff
	for(let i = 0; i < arr.length; ++i)
	{
		let newIndex = i + Math.floor(Math.random() * arr.length - i);

		let temp = arr[i];
		arr[i] = arr[newIndex];
		arr[newIndex] = temp;
	}
}


exports.shuffle = shuffle;
