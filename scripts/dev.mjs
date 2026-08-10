import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SUCCESS_EXIT_CODE = 0;
const FAILURE_EXIT_CODE = 1;
const FORCE_STOP_DELAY_MS = 3000;

// Convex's `--start` command is detached on Windows, which opens another console.
// Keeping both processes attached here makes their output stay in the current terminal.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const commands = [
  {
    command: resolve(projectRoot, "node_modules/convex/bin/main.js"),
    args: ["dev"],
  },
  {
    command: resolve(projectRoot, "node_modules/next/dist/bin/next"),
    args: ["dev"],
  },
];

const children = commands.map(({ command, args }) =>
  spawn(process.execPath, [command, ...args], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
  }),
);

let isShuttingDown = false;

function stopChildren() {
  for (const child of children) {
    if (child.exitCode === null) {
      child.kill("SIGINT");
    }
  }
}

function shutDown(exitCode) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  process.exitCode = exitCode;
  stopChildren();

  const forceStop = setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null) {
        child.kill();
      }
    }
  }, FORCE_STOP_DELAY_MS);

  forceStop.unref();
}

for (const child of children) {
  child.on("error", (error) => {
    console.error(error);
    shutDown(FAILURE_EXIT_CODE);
  });

  child.on("exit", (code) => {
    if (!isShuttingDown) {
      shutDown(code ?? FAILURE_EXIT_CODE);
    }
  });
}

process.once("SIGINT", () => shutDown(SUCCESS_EXIT_CODE));
process.once("SIGTERM", () => shutDown(SUCCESS_EXIT_CODE));
