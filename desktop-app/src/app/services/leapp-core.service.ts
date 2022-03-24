import { Injectable } from "@angular/core";
import { AuthenticationService } from "@noovolari/leapp-core/services/authentication-service";
import { CliCommunicationService } from "@noovolari/leapp-core/services/cli-communication-service";
import { DesktopAppRemoteProcedures } from "@noovolari/leapp-core/services/desktop-app-remote-procedures";
import { AwsIamUserService } from "@noovolari/leapp-core/services/session/aws/aws-iam-user-service";
import { FileService } from "@noovolari/leapp-core/services/file-service";
import { KeychainService } from "@noovolari/leapp-core/services/keychain-service";
import { AwsCoreService } from "@noovolari/leapp-core/services/aws-core-service";
import { LoggingService } from "@noovolari/leapp-core/services/logging-service";
import { TimerService } from "@noovolari/leapp-core/services/timer-service";
import { AwsIamRoleFederatedService } from "@noovolari/leapp-core/services/session/aws/aws-iam-role-federated-service";
import { AzureService } from "@noovolari/leapp-core/services/session/azure/azure-service";
import { ElectronService } from "./electron.service";
import { MfaCodePromptService } from "./mfa-code-prompt.service";
import { ExecuteService } from "@noovolari/leapp-core/services/execute-service";
import { RetroCompatibilityService } from "@noovolari/leapp-core/services/retro-compatibility-service";
import { AwsAuthenticationService } from "./session/aws/aws-authentication.service";
import { AwsParentSessionFactory } from "@noovolari/leapp-core/services/session/aws/aws-parent-session.factory";
import { AwsIamRoleChainedService } from "@noovolari/leapp-core/services/session/aws/aws-iam-role-chained-service";
import { Repository } from "@noovolari/leapp-core/services/repository";
import { AwsSsoRoleService } from "@noovolari/leapp-core/services/session/aws/aws-sso-role-service";
import { AwsSsoOidcService } from "@noovolari/leapp-core/services/aws-sso-oidc.service";
import { VerificationWindowService } from "./verification-window.service";
import { WorkspaceService } from "@noovolari/leapp-core/services/workspace-service";
import { SessionFactory } from "@noovolari/leapp-core/services/session-factory";
import { RotationService } from "@noovolari/leapp-core/services/rotation-service";
import { AzureCoreService } from "@noovolari/leapp-core/services/azure-core-service";
import { constants } from "@noovolari/leapp-core/models/constants";
import { AwsSsoIntegrationService } from "@noovolari/leapp-core/services/aws-sso-integration-service";
import { WebConsoleService } from "@noovolari/leapp-core/services/web-console-service";
import { WindowService } from "./window.service";
import { SsmService } from "@noovolari/leapp-core/services/ssm-service";

@Injectable({
  providedIn: "root",
})
export class LeappCoreService {
  // Injected by app.component
  mfaCodePrompter: MfaCodePromptService;
  awsAuthenticationService: AwsAuthenticationService;
  verificationWindowService: VerificationWindowService;
  windowService: WindowService;

  private workspaceServiceInstance: WorkspaceService;
  private awsIamUserServiceInstance: AwsIamUserService;
  private awsIamRoleFederatedServiceInstance: AwsIamRoleFederatedService;
  private awsIamRoleChainedServiceInstance: AwsIamRoleChainedService;
  private awsSsoRoleServiceInstance: AwsSsoRoleService;
  private awsSsoIntegrationServiceInstance: AwsSsoIntegrationService;
  private awsSsoOidcServiceInstance: AwsSsoOidcService;
  private awsCoreServiceInstance: AwsCoreService;
  private azureServiceInstance: AzureService;
  private authenticationServiceInstance: AuthenticationService;
  private sessionFactoryInstance: SessionFactory;
  private awsParentSessionFactoryInstance: AwsParentSessionFactory;
  private fileServiceInstance: FileService;
  private repositoryInstance: Repository;
  private keyChainServiceInstance: KeychainService;
  private loggingServiceInstance: LoggingService;
  private timerServiceInstance: TimerService;
  private executeServiceInstance: ExecuteService;
  private rotationServiceInstance: RotationService;
  private retroCompatibilityServiceInstance: RetroCompatibilityService;
  private azureCoreServiceInstance: AzureCoreService;
  private webConsoleServiceInstance: WebConsoleService;
  private ssmServiceInstance: SsmService;
  private cliCommunicationServiceInstance: CliCommunicationService;
  private desktopAppRemoteProceduresInstance: DesktopAppRemoteProcedures;

  constructor(private electronService: ElectronService) {}

  public get webConsoleService(): WebConsoleService {
    if (!this.webConsoleServiceInstance) {
      this.webConsoleServiceInstance = new WebConsoleService(this.windowService, this.loggingService, window.fetch);
    }
    return this.webConsoleServiceInstance;
  }

  public get workspaceService(): WorkspaceService {
    if (!this.workspaceServiceInstance) {
      this.workspaceServiceInstance = new WorkspaceService(this.repository);
    }
    return this.workspaceServiceInstance;
  }

  public get awsIamUserService(): AwsIamUserService {
    if (!this.awsIamUserServiceInstance) {
      this.awsIamUserServiceInstance = new AwsIamUserService(
        this.workspaceService,
        this.repository,
        this.mfaCodePrompter,
        this.keyChainService,
        this.fileService,
        this.awsCoreService
      );
    }
    return this.awsIamUserServiceInstance;
  }

  public get awsIamRoleFederatedService(): AwsIamRoleFederatedService {
    if (!this.awsIamRoleFederatedServiceInstance) {
      this.awsIamRoleFederatedServiceInstance = new AwsIamRoleFederatedService(
        this.workspaceService,
        this.repository,
        this.fileService,
        this.awsCoreService,
        this.awsAuthenticationService,
        constants.samlRoleSessionDuration
      );
    }
    return this.awsIamRoleFederatedServiceInstance;
  }

  public get awsIamRoleChainedService(): AwsIamRoleChainedService {
    if (!this.awsIamRoleChainedServiceInstance) {
      this.awsIamRoleChainedServiceInstance = new AwsIamRoleChainedService(
        this.workspaceService,
        this.repository,
        this.awsCoreService,
        this.fileService,
        this.awsIamUserService,
        this.awsParentSessionFactory
      );
    }
    return this.awsIamRoleChainedServiceInstance;
  }

  public get awsSsoIntegrationService(): AwsSsoIntegrationService {
    if (!this.awsSsoIntegrationServiceInstance) {
      this.awsSsoIntegrationServiceInstance = new AwsSsoIntegrationService(
        this.repository,
        this.awsSsoOidcService,
        this.awsSsoRoleService,
        this.keyChainService,
        this.workspaceService,
        this.electronService,
        this.sessionFactory
      );
    }
    return this.awsSsoIntegrationServiceInstance;
  }

  public get awsSsoRoleService(): AwsSsoRoleService {
    if (!this.awsSsoRoleServiceInstance) {
      this.awsSsoRoleServiceInstance = new AwsSsoRoleService(
        this.workspaceService,
        this.repository,
        this.fileService,
        this.keyChainService,
        this.awsCoreService,
        this.electronService,
        this.awsSsoOidcService
      );
    }
    return this.awsSsoRoleServiceInstance;
  }

  public get awsSsoOidcService(): AwsSsoOidcService {
    if (!this.awsSsoOidcServiceInstance) {
      this.awsSsoOidcServiceInstance = new AwsSsoOidcService(this.verificationWindowService, this.repository);
    }
    return this.awsSsoOidcServiceInstance;
  }

  public get awsCoreService(): AwsCoreService {
    if (!this.awsCoreServiceInstance) {
      this.awsCoreServiceInstance = new AwsCoreService(this.electronService);
    }
    return this.awsCoreServiceInstance;
  }

  public get azureService(): AzureService {
    if (!this.azureServiceInstance) {
      this.azureServiceInstance = new AzureService(
        this.workspaceService,
        this.repository,
        this.fileService,
        this.executeService,
        constants.azureAccessTokens
      );
    }

    return this.azureServiceInstance;
  }

  public get authenticationService(): AuthenticationService {
    if (!this.authenticationServiceInstance) {
      this.authenticationServiceInstance = new AuthenticationService();
    }
    return this.authenticationServiceInstance;
  }

  public get sessionFactory(): SessionFactory {
    if (!this.sessionFactoryInstance) {
      this.sessionFactoryInstance = new SessionFactory(
        this.awsIamUserService,
        this.awsIamRoleFederatedService,
        this.awsIamRoleChainedService,
        this.awsSsoRoleService,
        this.azureService
      );
    }
    return this.sessionFactoryInstance;
  }

  public get ssmService(): SsmService {
    if (!this.ssmServiceInstance) {
      this.ssmServiceInstance = new SsmService(this.loggingService, this.executeService);
    }
    return this.ssmServiceInstance;
  }

  public get awsParentSessionFactory(): AwsParentSessionFactory {
    if (!this.awsParentSessionFactoryInstance) {
      this.awsParentSessionFactoryInstance = new AwsParentSessionFactory(
        this.awsIamUserService,
        this.awsIamRoleFederatedService,
        this.awsSsoRoleService
      );
    }
    return this.awsParentSessionFactoryInstance;
  }

  public get fileService(): FileService {
    if (!this.fileServiceInstance) {
      this.fileServiceInstance = new FileService(this.electronService);
    }
    return this.fileServiceInstance;
  }

  public get repository(): Repository {
    if (!this.repositoryInstance) {
      this.repositoryInstance = new Repository(this.electronService, this.fileService);
    }
    return this.repositoryInstance;
  }

  public get keyChainService(): KeychainService {
    if (!this.keyChainServiceInstance) {
      this.keyChainServiceInstance = new KeychainService(this.electronService);
    }
    return this.keyChainServiceInstance;
  }

  public get loggingService(): LoggingService {
    if (!this.loggingServiceInstance) {
      this.loggingServiceInstance = new LoggingService(this.electronService);
    }
    return this.loggingServiceInstance;
  }

  public get timerService(): TimerService {
    if (!this.timerServiceInstance) {
      this.timerServiceInstance = new TimerService();
    }
    return this.timerServiceInstance;
  }

  public get executeService(): ExecuteService {
    if (!this.executeServiceInstance) {
      this.executeServiceInstance = new ExecuteService(this.electronService, this.repository);
    }
    return this.executeServiceInstance;
  }

  public get rotationService(): RotationService {
    if (!this.rotationServiceInstance) {
      this.rotationServiceInstance = new RotationService(this.sessionFactory, this.repository);
    }
    return this.rotationServiceInstance;
  }

  public get retroCompatibilityService(): RetroCompatibilityService {
    if (!this.retroCompatibilityServiceInstance) {
      this.retroCompatibilityServiceInstance = new RetroCompatibilityService(
        this.fileService,
        this.keyChainService,
        this.repository,
        this.workspaceService,
        constants.appName,
        constants.lockFileDestination
      );
    }
    return this.retroCompatibilityServiceInstance;
  }

  public get azureCoreService(): AzureCoreService {
    if (!this.azureCoreServiceInstance) {
      this.azureCoreServiceInstance = new AzureCoreService();
    }
    return this.azureCoreServiceInstance;
  }

  public get cliCommunicationService(): CliCommunicationService {
    if (!this.cliCommunicationServiceInstance) {
      this.cliCommunicationServiceInstance = new CliCommunicationService(
        this.electronService,
        this.verificationWindowService,
        this.awsAuthenticationService,
        this.repository,
        this.workspaceService
      );
    }
    return this.cliCommunicationServiceInstance;
  }

  public get desktopAppRemoteProcedures(): DesktopAppRemoteProcedures {
    if (!this.desktopAppRemoteProceduresInstance) {
      this.desktopAppRemoteProceduresInstance = new DesktopAppRemoteProcedures(this.electronService);
    }
    return this.desktopAppRemoteProceduresInstance;
  }
}
