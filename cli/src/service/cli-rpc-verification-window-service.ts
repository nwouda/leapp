import { IVerificationWindowService } from "@noovolari/leapp-core/interfaces/i-verification-window.service";
import {
  RegisterClientResponse,
  StartDeviceAuthorizationResponse,
  VerificationResponse,
} from "@noovolari/leapp-core/services/session/aws/aws-sso-role-service";
import { DesktopAppRemoteProcedures } from "@noovolari/leapp-core/services/desktop-app-remote-procedures";

export class CliRpcVerificationWindowService implements IVerificationWindowService {
  constructor(private desktopAppRemoteProcedures: DesktopAppRemoteProcedures) {}

  async openVerificationWindow(
    registerClientResponse: RegisterClientResponse,
    startDeviceAuthorizationResponse: StartDeviceAuthorizationResponse,
    windowModality: string,
    onWindowClose: () => void
  ): Promise<VerificationResponse> {
    return this.desktopAppRemoteProcedures.openVerificationWindow(
      registerClientResponse,
      startDeviceAuthorizationResponse,
      windowModality,
      onWindowClose
    );
  }
}
