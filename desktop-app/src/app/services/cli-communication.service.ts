import { Injectable } from "@angular/core";
import { LeappCoreService } from "./leapp-core.service";
import { integrationsFilter } from "../components/integration-bar/integration-bar.component";
import { IAwsAuthenticationService } from "@noovolari/leapp-core/interfaces/i-aws-authentication.service";
import { IVerificationWindowService } from "@noovolari/leapp-core/interfaces/i-verification-window.service";
import { INativeService } from "@noovolari/leapp-core/dist/interfaces/i-native-service";

@Injectable({
  providedIn: "root",
})
export class CliCommunicationService {
  rpcMethods = {
    isDesktopAppRunning: (emitFunction, socket) => emitFunction(socket, "message", { result: true }),
    needAuthentication: (emitFunction, data, socket) =>
      this.awsAuthenticationService.needAuthentication(data.idpUrl).then((result: boolean) => {
        emitFunction(socket, "message", { result });
      }),
    awsSignIn: (emitFunction, socket, data) =>
      this.awsAuthenticationService
        .awsSignIn(data.idpUrl, data.needToAuthenticate)
        .then((result: any) => emitFunction(socket, "message", { result }))
        .catch((error) => emitFunction(socket, "message", { error })),
    openVerificationWindow: (emitFunction, socket, data) =>
      this.verificationWindowService
        .openVerificationWindow(data.registerClientResponse, data.startDeviceAuthorizationResponse, data.windowModality, () =>
          emitFunction(socket, "message", { callbackId: "onWindowClose" })
        )
        .then((result: any) => emitFunction(socket, "message", { result }))
        .catch((error) => emitFunction(socket, "message", { error })),
    refreshIntegrations: (emitFunction, socket) => {
      try {
        this.leappCoreService.repository.reloadWorkspace();
        integrationsFilter.next(this.leappCoreService.repository.listAwsSsoIntegrations());
        emitFunction(socket, "message", {});
      } catch (error) {
        emitFunction(socket, "message", { error });
      }
    },
    refreshSessions: (emitFunction, socket) => {
      try {
        this.leappCoreService.repository.reloadWorkspace();
        const sessions = this.leappCoreService.repository.getSessions();
        this.leappCoreService.workspaceService.setSessions(sessions);
        emitFunction(socket, "message", {});
      } catch (error) {
        emitFunction(socket, "message", { error });
      }
    },
  };

  constructor(
    private nativeService: INativeService,
    private leappCoreService: LeappCoreService,
    private verificationWindowService: IVerificationWindowService,
    private awsAuthenticationService: IAwsAuthenticationService
  ) {}

  startServer(): void {
    const ipc = this.nativeService.nodeIpc;
    ipc.config.id = "leapp_da";
    ipc.serve(() => {
      ipc.server.on("message", (data, socket) => {
        const emitFunction = (...params) => ipc.server.emit(...params);

        if (this.rpcMethods[data.method]) {
          this.rpcMethods[data.method](emitFunction, socket, data);
        } else {
          socket.destroy();
        }
      });
    });

    ipc.server.start();
  }
}
