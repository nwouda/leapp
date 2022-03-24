import { CloudProviderService } from "@noovolari/leapp-core/services/cloud-provider-service";
import { AwsIamUserService } from "@noovolari/leapp-core/services/session/aws/aws-iam-user-service";
import { FileService } from "@noovolari/leapp-core/services/file-service";
import { KeychainService } from "@noovolari/leapp-core/services/keychain-service";
import { AwsCoreService } from "@noovolari/leapp-core/services/aws-core-service";
import { LoggingService } from "@noovolari/leapp-core/services/logging-service";
import { TimerService } from "@noovolari/leapp-core/services/timer-service";
import { AwsIamRoleFederatedService } from "@noovolari/leapp-core/services/session/aws/aws-iam-role-federated-service";
import { AzureService } from "@noovolari/leapp-core/services/session/azure/azure-service";
import { ExecuteService } from "@noovolari/leapp-core/services/execute-service";
import { RetroCompatibilityService } from "@noovolari/leapp-core/services/retro-compatibility-service";
import { AwsParentSessionFactory } from "@noovolari/leapp-core/services/session/aws/aws-parent-session.factory";
import { AwsIamRoleChainedService } from "@noovolari/leapp-core/services/session/aws/aws-iam-role-chained-service";
import { Repository } from "@noovolari/leapp-core/services/repository";
import { RegionsService } from "@noovolari/leapp-core/services/regions-service";
import { AwsSsoRoleService } from "@noovolari/leapp-core/services/session/aws/aws-sso-role-service";
import { WorkspaceService } from "@noovolari/leapp-core/services/workspace-service";
import { SessionFactory } from "@noovolari/leapp-core/services/session-factory";
import { RotationService } from "@noovolari/leapp-core/services/rotation-service";
import { AzureCoreService } from "@noovolari/leapp-core/services/azure-core-service";
import { CliMfaCodePromptService } from "./cli-mfa-code-prompt-service";
import { CliNativeService } from "./cli-native-service";
import { DesktopAppRemoteProcedures } from "@noovolari/leapp-core/services/desktop-app-remote-procedures";
import { constants } from "@noovolari/leapp-core/models/constants";
import { NamedProfilesService } from "@noovolari/leapp-core/services/named-profiles-service";
import { IdpUrlsService } from "@noovolari/leapp-core/services/idp-urls-service";
import { AwsSsoIntegrationService } from "@noovolari/leapp-core/services/aws-sso-integration-service";
import CliInquirer from "inquirer";
import { AwsSsoOidcService } from "@noovolari/leapp-core/services/aws-sso-oidc.service";
import { CliOpenWebConsoleService } from "./cli-open-web-console-service";
import { WebConsoleService } from "@noovolari/leapp-core/services/web-console-service";
import fetch from "node-fetch";
import { AuthenticationService } from "@noovolari/leapp-core/services/authentication-service";
import { SsmService } from "@noovolari/leapp-core/services/ssm-service";
import { CliRpcVerificationWindowService } from "./cli-rpc-verification-window-service";
import { IVerificationWindowService } from "@noovolari/leapp-core/interfaces/i-verification-window.service";
import { CliRpcAwsAuthenticationService } from "./cli-rpc-aws-authentication-service";

/* eslint-disable */
export class LeappCliService {
  private cliNativeServiceInstance: CliNativeService;

  public get cliNativeService(): CliNativeService {
    if (!this.cliNativeServiceInstance) {
      this.cliNativeServiceInstance = new CliNativeService();
    }

    return this.cliNativeServiceInstance;
  }

  private cliVerificationWindowServiceInstance: IVerificationWindowService;

  public get cliVerificationWindowService(): IVerificationWindowService {
    if (!this.cliVerificationWindowServiceInstance) {
      this.cliVerificationWindowServiceInstance = new CliRpcVerificationWindowService(this.desktopAppRemoteProcedures);
    }

    return this.cliVerificationWindowServiceInstance;
  }

  private authenticationServiceInstance: AuthenticationService;

  public get authenticationService(): AuthenticationService {
    if (!this.authenticationServiceInstance) {
      this.authenticationServiceInstance = new AuthenticationService();
    }

    return this.authenticationServiceInstance;
  }

  private cliRpcAwsAuthenticationServiceInstance: CliRpcAwsAuthenticationService;

  public get cliRpcAwsAuthenticationService(): CliRpcAwsAuthenticationService {
    if (!this.cliRpcAwsAuthenticationServiceInstance) {
      this.cliRpcAwsAuthenticationServiceInstance = new CliRpcAwsAuthenticationService(this.desktopAppRemoteProcedures);
    }

    return this.cliRpcAwsAuthenticationServiceInstance;
  }

  private desktopAppRemoteProceduresInstance: DesktopAppRemoteProcedures;

  public get desktopAppRemoteProcedures(): DesktopAppRemoteProcedures {
    if (!this.desktopAppRemoteProceduresInstance) {
      this.desktopAppRemoteProceduresInstance = new DesktopAppRemoteProcedures(this.cliNativeService);
    }

    return this.desktopAppRemoteProceduresInstance;
  }

  private cliMfaCodePromptServiceInstance: CliMfaCodePromptService;

  public get cliMfaCodePromptService(): CliMfaCodePromptService {
    if (!this.cliMfaCodePromptServiceInstance) {
      this.cliMfaCodePromptServiceInstance = new CliMfaCodePromptService(this.inquirer);
    }

    return this.cliMfaCodePromptServiceInstance;
  }

  private workspaceServiceInstance: WorkspaceService;

  public get workspaceService(): WorkspaceService {
    if (!this.workspaceServiceInstance) {
      this.workspaceServiceInstance = new WorkspaceService(this.repository);
    }

    return this.workspaceServiceInstance;
  }

  private awsIamUserServiceInstance: AwsIamUserService;

  public get awsIamUserService(): AwsIamUserService {
    if (!this.awsIamUserServiceInstance) {
      this.awsIamUserServiceInstance = new AwsIamUserService(this.workspaceService, this.repository, this.cliMfaCodePromptService,
        this.keyChainService, this.fileService, this.awsCoreService);
    }

    return this.awsIamUserServiceInstance;
  }

  private awsIamRoleFederatedServiceInstance: AwsIamRoleFederatedService;

  get awsIamRoleFederatedService(): AwsIamRoleFederatedService {
    if (!this.awsIamRoleFederatedServiceInstance) {
      this.awsIamRoleFederatedServiceInstance = new AwsIamRoleFederatedService(this.workspaceService, this.repository,
        this.fileService, this.awsCoreService, this.cliRpcAwsAuthenticationService, constants.samlRoleSessionDuration);
    }

    return this.awsIamRoleFederatedServiceInstance;
  }

  private awsIamRoleChainedServiceInstance: AwsIamRoleChainedService;

  get awsIamRoleChainedService(): AwsIamRoleChainedService {
    if (!this.awsIamRoleChainedServiceInstance) {
      this.awsIamRoleChainedServiceInstance = new AwsIamRoleChainedService(this.workspaceService, this.repository,
        this.awsCoreService, this.fileService, this.awsIamUserService, this.awsParentSessionFactory);
    }

    return this.awsIamRoleChainedServiceInstance;
  }

  private awsSsoRoleServiceInstance: AwsSsoRoleService;

  get awsSsoRoleService(): AwsSsoRoleService {
    if (!this.awsSsoRoleServiceInstance) {
      this.awsSsoRoleServiceInstance = new AwsSsoRoleService(this.workspaceService, this.repository, this.fileService,
        this.keyChainService, this.awsCoreService, this.cliNativeService, this.awsSsoOidcService);
    }

    return this.awsSsoRoleServiceInstance;
  }

  private awsSsoOidcServiceInstance: AwsSsoOidcService;

  get awsSsoOidcService(): AwsSsoOidcService {
    if (!this.awsSsoOidcServiceInstance) {
      this.awsSsoOidcServiceInstance = new AwsSsoOidcService(this.cliVerificationWindowService, this.repository, true);
    }

    return this.awsSsoOidcServiceInstance;
  }

  private azureServiceInstance: AzureService;

  get azureService(): AzureService {
    if (!this.azureServiceInstance) {
      this.azureServiceInstance = new AzureService(this.workspaceService, this.repository, this.fileService, this.executeService,
        constants.azureAccessTokens);
    }

    return this.azureServiceInstance;
  }

  private sessionFactoryInstance: SessionFactory;

  get sessionFactory(): SessionFactory {
    if (!this.sessionFactoryInstance) {
      this.sessionFactoryInstance = new SessionFactory(this.awsIamUserService, this.awsIamRoleFederatedService,
        this.awsIamRoleChainedService, this.awsSsoRoleService, this.azureService);
    }

    return this.sessionFactoryInstance;
  }

  private awsParentSessionFactoryInstance: AwsParentSessionFactory;

  get awsParentSessionFactory(): AwsParentSessionFactory {
    if (!this.awsParentSessionFactoryInstance) {
      this.awsParentSessionFactoryInstance = new AwsParentSessionFactory(this.awsIamUserService, this.awsIamRoleFederatedService,
        this.awsSsoRoleService);
    }

    return this.awsParentSessionFactoryInstance;
  }

  private fileServiceInstance: FileService;

  get fileService(): FileService {
    if (!this.fileServiceInstance) {
      this.fileServiceInstance = new FileService(this.cliNativeService);
    }

    return this.fileServiceInstance;
  }

  private repositoryInstance: Repository;

  get repository(): Repository {
    if (!this.repositoryInstance) {
      this.repositoryInstance = new Repository(this.cliNativeService, this.fileService);
    }

    return this.repositoryInstance;
  }

  private regionsServiceInstance: RegionsService;

  get regionsService(): RegionsService {
    if (!this.regionsServiceInstance) {
      this.regionsServiceInstance = new RegionsService(this.sessionFactory, this.repository, this.workspaceService);
    }

    return this.regionsServiceInstance;
  }

  private namedProfilesServiceInstance: NamedProfilesService;

  get namedProfilesService(): NamedProfilesService {
    if (!this.namedProfilesServiceInstance) {
      this.namedProfilesServiceInstance = new NamedProfilesService(this.sessionFactory, this.repository, this.workspaceService);
    }

    return this.namedProfilesServiceInstance;
  }

  private idpUrlsServiceInstance: IdpUrlsService;

  get idpUrlsService(): IdpUrlsService {
    if (!this.idpUrlsServiceInstance) {
      this.idpUrlsServiceInstance = new IdpUrlsService(this.sessionFactory, this.repository);
    }

    return this.idpUrlsServiceInstance;
  }

  private awsSsoIntegrationServiceInstance: AwsSsoIntegrationService;

  get awsSsoIntegrationService(): AwsSsoIntegrationService {
    if (!this.awsSsoIntegrationServiceInstance) {
      this.awsSsoIntegrationServiceInstance = new AwsSsoIntegrationService(this.repository, this.awsSsoOidcService,
        this.awsSsoRoleService, this.keyChainService, this.workspaceService, this.cliNativeService, this.sessionFactory);
    }

    return this.awsSsoIntegrationServiceInstance;
  }

  private keyChainServiceInstance: KeychainService;

  get keyChainService(): KeychainService {
    if (!this.keyChainServiceInstance) {
      this.keyChainServiceInstance = new KeychainService(this.cliNativeService);
    }

    return this.keyChainServiceInstance;
  }

  private loggingServiceInstance: LoggingService;

  get loggingService(): LoggingService {
    if (!this.loggingServiceInstance) {
      this.loggingServiceInstance = new LoggingService(this.cliNativeService);
    }

    return this.loggingServiceInstance;
  }

  private timerServiceInstance: TimerService;

  get timerService(): TimerService {
    if (!this.timerServiceInstance) {
      this.timerServiceInstance = new TimerService();
    }

    return this.timerServiceInstance;
  }

  private executeServiceInstance: ExecuteService;

  get executeService(): ExecuteService {
    if (!this.executeServiceInstance) {
      this.executeServiceInstance = new ExecuteService(this.cliNativeService, this.repository);
    }

    return this.executeServiceInstance;
  }

  private rotationServiceInstance: RotationService;

  get rotationService(): RotationService {
    if (!this.rotationServiceInstance) {
      this.rotationServiceInstance = new RotationService(this.sessionFactory, this.repository);
    }

    return this.rotationServiceInstance;
  }

  private retroCompatibilityServiceInstance: RetroCompatibilityService;

  get retroCompatibilityService(): RetroCompatibilityService {
    if (!this.retroCompatibilityServiceInstance) {
      this.retroCompatibilityServiceInstance = new RetroCompatibilityService(this.fileService, this.keyChainService,
        this.repository, this.workspaceService, constants.appName, constants.lockFileDestination);
    }

    return this.retroCompatibilityServiceInstance;
  }

  private cloudProviderServiceInstance: CloudProviderService;

  get cloudProviderService(): CloudProviderService {
    if (!this.cloudProviderServiceInstance) {
      this.cloudProviderServiceInstance = new CloudProviderService(this.awsCoreService, this.azureCoreService,
        this.namedProfilesService, this.idpUrlsService, this.repository);
    }

    return this.cloudProviderServiceInstance;
  }

  private awsCoreServiceInstance: AwsCoreService;

  get awsCoreService(): AwsCoreService {
    if (!this.awsCoreServiceInstance) {
      this.awsCoreServiceInstance = new AwsCoreService(this.cliNativeService);
    }

    return this.awsCoreServiceInstance;
  }

  private azureCoreServiceInstance: AzureCoreService;

  get azureCoreService(): AzureCoreService {
    if (!this.azureCoreServiceInstance) {
      this.azureCoreServiceInstance = new AzureCoreService();
    }

    return this.azureCoreServiceInstance;
  }

  private cliOpenWebConsoleServiceInstance: CliOpenWebConsoleService;

  get cliOpenWebConsoleService(): CliOpenWebConsoleService {
    if (!this.cliOpenWebConsoleServiceInstance) {
      this.cliOpenWebConsoleServiceInstance = new CliOpenWebConsoleService();
    }

    return this.cliOpenWebConsoleServiceInstance;
  }

  private webConsoleServiceInstance: WebConsoleService;

  get webConsoleService(): WebConsoleService {
    if (!this.webConsoleServiceInstance) {
      this.webConsoleServiceInstance = new WebConsoleService(this.cliOpenWebConsoleService, this.loggingService, fetch);
    }

    return this.webConsoleServiceInstance;
  }

  private ssmServiceInstance: SsmService;

  get ssmService(): SsmService {
    if (!this.ssmServiceInstance) {
      this.ssmServiceInstance = new SsmService(this.loggingService, this.executeService);
    }

    return this.ssmServiceInstance;
  }

  get inquirer(): CliInquirer.Inquirer {
    return CliInquirer;
  }
}
