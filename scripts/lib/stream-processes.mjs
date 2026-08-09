import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

export async function streamProcessToProcess(source, target) {
  const sourceProcess = spawn(source.command, source.argumentsList, {
    env: source.environment ?? process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  const targetProcess = spawn(target.command, target.argumentsList, {
    env: target.environment ?? process.env,
    stdio: ["pipe", "ignore", "pipe"],
    windowsHide: true
  });
  sourceProcess.stderr.resume();
  targetProcess.stderr.resume();
  const hash = createHash("sha256");
  let sizeBytes = 0;
  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      sizeBytes += chunk.length;
      callback(null, chunk);
    }
  });

  try {
    await Promise.all([
      pipeline(sourceProcess.stdout, meter, targetProcess.stdin),
      waitForProcess(sourceProcess, source.label),
      waitForProcess(targetProcess, target.label)
    ]);
  } catch (error) {
    sourceProcess.kill();
    targetProcess.kill();
    throw error;
  }

  return { sha256: hash.digest("hex"), sizeBytes };
}

function waitForProcess(child, label) {
  return new Promise((resolve, reject) => {
    child.once("error", (error) => {
      reject(new Error(`${label} could not start: ${error.message}`));
    });
    child.once("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code}.`));
    });
  });
}
