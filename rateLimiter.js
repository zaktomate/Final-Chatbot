const queue = [];
let isRunning = false;
const delay = 5000; // 5 second between API calls

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processQueue() {
  if (isRunning || queue.length === 0) return;

  isRunning = true;

  while (queue.length > 0) {
    const task = queue.shift();
    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    }

    await sleep(delay);
    console.log(`⏳ Processing next API call at ${new Date().toLocaleTimeString()}`);
  }

  isRunning = false;
}

/**
 * Wrap any async function call with rate limiting
 * @param {Function} fn
 * @returns {Promise}
 */
function rateLimit(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    processQueue();
  });
}

module.exports = rateLimit;
