import { RegisterClientResponse, StartDeviceAuthorizationResponse, VerificationResponse } from "./session/aws/aws-sso-role-service";
import { INativeService } from "../interfaces/i-native-service";

const connectionError = "unable to connect with desktop app";

export class DesktopAppRemoteProcedures {
  constructor(private nativeService: INativeService, private serverId = "leapp_da") {}

  async isDesktopAppRunning(): Promise<boolean> {
    return this.remoteProcedureCall(
      { method: "isDesktopAppRunning" },
      (data, resolve, _) => resolve(data.result),
      () => null,
      (resolve, _) => resolve(false)
    );
  }

  async needAuthentication(idpUrl: string): Promise<boolean> {
    return this.remoteProcedureCall(
      { method: "needAuthentication", idpUrl },
      (data, resolve, reject) => (data.error ? reject(data.error) : resolve(data.result)),
      () => null,
      (_, reject) => reject(connectionError)
    );
  }

  async awsSignIn(idpUrl: string, needToAuthenticate: boolean): Promise<any> {
    return this.remoteProcedureCall(
      { method: "awsSignIn", idpUrl, needToAuthenticate },
      (data, resolve, reject) => (data.error ? reject(data.error) : resolve(data.result)),
      () => null,
      (_, reject) => reject(connectionError)
    );
  }

  async openVerificationWindow(
    registerClientResponse: RegisterClientResponse,
    startDeviceAuthorizationResponse: StartDeviceAuthorizationResponse,
    windowModality: string,
    onWindowClose: () => void
  ): Promise<VerificationResponse> {
    return this.remoteProcedureCall(
      { method: "openVerificationWindow", registerClientResponse, startDeviceAuthorizationResponse, windowModality },
      (data, resolve, reject) => (data.error ? reject(data.error) : resolve(data.result)),
      (data, _, __) => (data.callbackId === "onWindowClose" ? onWindowClose() : null),
      (_, reject) => reject(connectionError)
    );
  }

  async refreshSessions(): Promise<void> {
    return this.remoteProcedureCall(
      { method: "refreshSessions" },
      (data, resolve, reject) => (data.error ? reject(data.error) : resolve(data.result)),
      () => null,
      (_, reject) => reject(connectionError)
    );
  }

  async refreshIntegrations(): Promise<void> {
    return this.remoteProcedureCall(
      { method: "refreshIntegrations" },
      (data, resolve, reject) => (data.error ? reject(data.error) : resolve(data.result)),
      () => null,
      (_, reject) => reject(connectionError)
    );
  }

  async remoteProcedureCall(
    callMessage: any,
    onReturn: (data: any, resolve: (value: unknown) => void, reject: (reason?: any) => void) => void,
    onCallback: (data: any, resolve: (value: unknown) => void, reject: (reason?: any) => void) => void,
    onDisconnect: (resolve: (value: unknown) => void, reject: (reason?: any) => void) => void
  ): Promise<any> {
    const ipc = this.nativeService.nodeIpc;
    ipc.config.id = "leapp_cli";
    ipc.config.maxRetries = 2;
    ipc.config.silent = true;
    ipc.config.encoding = "utf8";
    return new Promise((resolve, reject) => {
      ipc.connectTo(this.serverId, () => {
        const desktopAppServer = ipc.of[this.serverId];
        desktopAppServer.on("connect", () => {
          desktopAppServer.emit("message", callMessage);
        });
        desktopAppServer.on("disconnect", () => {
          onDisconnect(resolve, reject);
        });
        desktopAppServer.on("message", (data: any) => {
          if (data.callbackId) {
            onCallback(data, resolve, reject);
          } else {
            onReturn(data, resolve, reject);
            ipc.disconnect(this.serverId);
          }
        });
      });
    });
  }
}
