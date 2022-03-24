import { jest, describe, test } from "@jest/globals";
import { CliCommunicationService } from "./cli-communication-service";
import ipc from "node-ipc";

describe("CliCommunicationService", () => {
  const callClientMethod = (serverId: string, callMessage: any) => {
    ipc.config.id = "leapp_test";
    ipc.config.maxRetries = 2;
    ipc.config.silent = true;
    ipc.config.encoding = "utf8";
    return new Promise((resolve, _reject) => {
      ipc.connectTo(serverId, () => {
        const desktopAppServer = ipc.of[serverId];
        desktopAppServer.on("connect", () => {
          desktopAppServer.emit("message", callMessage);
        });
        desktopAppServer.on("disconnect", () => {
          resolve("disconnected");
        });
        desktopAppServer.on("message", (data: any) => {
          resolve({ message: data });
        });
      });
    });
  };

  test("isDesktopRunning", () => {
    const service = new CliCommunicationService(null, null, null, null, null);

    const emitFunction = jest.fn();
    const socket = "socket";

    service.rpcMethods["isDesktopAppRunning"](emitFunction, socket);

    expect(emitFunction).toHaveBeenCalledWith(socket, "message", { result: true });
  });

  test("isDesktopAppRunning - connection", async () => {
    const nativeService = {
      nodeIpc: ipc,
    };
    const testId = `rpc_test${Math.random() * 10000}`;
    const service = new CliCommunicationService(nativeService as any, null, null, null, null, testId);

    expect(await callClientMethod(testId, { method: "isDesktopAppRunning" })).toBe("disconnected");

    service.startServer();

    await new Promise((resolve, reject) => {
      let retries = 0;
      setInterval(async () => {
        const actualResult = (await callClientMethod(testId, { method: "isDesktopAppRunning" })) as any;
        if (actualResult.message.result === true) {
          resolve(undefined);
        } else if (retries++ > 10) {
          reject("result not received");
        }
      }, 100);
    });
  });
});
