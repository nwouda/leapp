import { IAwsAuthenticationService } from "../interfaces/i-aws-authentication.service";
import { IVerificationWindowService } from "../interfaces/i-verification-window.service";
import { INativeService } from "../interfaces/i-native-service";
import { Repository } from "./repository";
import { WorkspaceService } from "./workspace-service";

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
        this.repository.reloadWorkspace();
        this.workspaceService.setIntegrations(this.repository.listAwsSsoIntegrations());
        emitFunction(socket, "message", {});
      } catch (error) {
        emitFunction(socket, "message", { error });
      }
    },
    refreshSessions: (emitFunction, socket) => {
      try {
        this.repository.reloadWorkspace();
        const sessions = this.repository.getSessions();
        this.workspaceService.setSessions(sessions);
        emitFunction(socket, "message", {});
      } catch (error) {
        emitFunction(socket, "message", { error });
      }
    },
  };

  constructor(
    private nativeService: INativeService,
    private verificationWindowService: IVerificationWindowService,
    private awsAuthenticationService: IAwsAuthenticationService,
    private repository: Repository,
    private workspaceService: WorkspaceService,
    private serverId: string = "laepp_da"
  ) {}

  startServer(): void {
    const ipc = this.nativeService.nodeIpc;
    ipc.config.id = this.serverId;
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
