import { describe, test, expect } from "@jest/globals";
import { DesktopAppRemoteProcedures } from "./desktop-app-remote-procedures";
import ipc from "node-ipc";

describe("DesktopAppRemoteProcedures", () => {
  test("isDesktopAppRunning", async () => {
    const nativeService = {
      nodeIpc: ipc,
    };
    const testId = `rpc_test${Math.random() * 10000}`;
    const desktopAppRemoteProcedures = new DesktopAppRemoteProcedures(nativeService as any, testId);

    expect(await desktopAppRemoteProcedures.isDesktopAppRunning()).toBe(false);

    ipc.config.id = testId;
    ipc.serve(() => {
      ipc.server.on("message", (data, socket) => {
        if (data.method === "isDesktopAppRunning") {
          ipc.server.emit(socket, "message", { result: true });
        }
      });
    });
    ipc.server.start();

    await new Promise((resolve, reject) => {
      let retries = 0;
      setInterval(async () => {
        const actualResult = await desktopAppRemoteProcedures.isDesktopAppRunning();
        if (actualResult) {
          resolve(undefined);
        } else if (retries++ > 10) {
          reject("result is still false");
        }
      }, 100);
    });
  });

  test("needAuthentication", async () => {});

  test("awsSignIn", async () => {});

  test("openVerificationWindow", async () => {});

  test("refreshSessions", async () => {});

  test("remoteProcedureCall", async () => {});
});
