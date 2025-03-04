import { parentPort } from "worker_threads";

// Ensure the worker is running in a thread context
if (!parentPort) {
  throw new Error("Worker must be run inside a worker thread.");
}

// Handle incoming messages (tasks)
parentPort.on("message", async (task) => {
  try {
    if (!task || typeof task !== "object" || !task.payload) {
      throw new Error("Invalid task received");
    }

    // Simulate execution (replace this with actual execution logic)
    const result = await executeTask(task.payload);

    // Send result back to the main thread
    parentPort.postMessage({ id: task.id, result, success: true });
  } catch (error) {
    parentPort.postMessage({ id: task.id, error: error.message, success: false });
  }
});

// Example function to execute tasks (replace this with actual compute logic)
async function executeTask(payload) {
  if (payload.script) {
    return runSandboxedScript(payload.script);
  }
  return `Processed payload: ${JSON.stringify(payload)}`;
}

// Simple script execution (sandboxed)
function runSandboxedScript(script) {
  return new Promise((resolve, reject) => {
    try {
      const result = eval(script); // ⚠️ Consider using `vm` for a safer approach
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}
