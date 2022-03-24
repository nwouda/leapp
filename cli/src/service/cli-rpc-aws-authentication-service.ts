import { IAwsAuthenticationService } from "@noovolari/leapp-core/interfaces/i-aws-authentication.service";
import { DesktopAppRemoteProcedures } from "@noovolari/leapp-core/services/desktop-app-remote-procedures";

export class CliRpcAwsAuthenticationService implements IAwsAuthenticationService {
  constructor(private desktopAppRemoteProcedures: DesktopAppRemoteProcedures) {}

  async needAuthentication(idpUrl: string): Promise<boolean> {
    return this.desktopAppRemoteProcedures.needAuthentication(idpUrl);
  }

  async awsSignIn(idpUrl: string, needToAuthenticate: boolean): Promise<string> {
    return this.desktopAppRemoteProcedures.awsSignIn(idpUrl, needToAuthenticate);
  }

  async closeAuthenticationWindow(): Promise<void> {
    // TODO: not yet implemented in desktop app
  }
}
