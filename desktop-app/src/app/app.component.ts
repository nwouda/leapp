import { Component, OnInit } from "@angular/core";
import { CliCommunicationService } from "@noovolari/leapp-core/services/cli-communication-service";
import { environment } from "../environments/environment";
import { AppService } from "./services/app.service";
import { Router } from "@angular/router";
import { setTheme } from "ngx-bootstrap/utils";
import { MfaCodePromptService } from "./services/mfa-code-prompt.service";
import { AwsAuthenticationService } from "./services/session/aws/aws-authentication.service";
import { UpdaterService } from "./services/updater.service";
import compareVersions from "compare-versions";
import { LoggerLevel, LoggingService } from "@noovolari/leapp-core/services/logging-service";
import { Repository } from "@noovolari/leapp-core/services/repository";
import { WorkspaceService } from "@noovolari/leapp-core/services/workspace-service";
import { LeappParseError } from "@noovolari/leapp-core/errors/leapp-parse-error";
import { TimerService } from "@noovolari/leapp-core/services/timer-service";
import { constants } from "@noovolari/leapp-core/models/constants";
import { FileService } from "@noovolari/leapp-core/services/file-service";
import { AwsCoreService } from "@noovolari/leapp-core/services/aws-core-service";
import { RetroCompatibilityService } from "@noovolari/leapp-core/services/retro-compatibility-service";
import { LeappCoreService } from "./services/leapp-core.service";
import { SessionFactory } from "@noovolari/leapp-core/services/session-factory";
import { RotationService } from "@noovolari/leapp-core/services/rotation-service";
import { VerificationWindowService } from "./services/verification-window.service";
import { WindowService } from "./services/window.service";
import { ElectronService } from "./services/electron.service";
import { AwsSsoIntegrationService } from "@noovolari/leapp-core/services/aws-sso-integration-service";
import { AwsSsoRoleService } from "@noovolari/leapp-core/services/session/aws/aws-sso-role-service";
import { SessionStatus } from "@noovolari/leapp-core/models/session-status";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  private fileService: FileService;
  private repository: Repository;
  private awsCoreService: AwsCoreService;
  private loggingService: LoggingService;
  private timerService: TimerService;
  private sessionServiceFactory: SessionFactory;
  private workspaceService: WorkspaceService;
  private retroCompatibilityService: RetroCompatibilityService;
  private rotationService: RotationService;
  private awsSsoIntegrationService: AwsSsoIntegrationService;
  private awsSsoRoleService: AwsSsoRoleService;
  private cliCommunicationService: CliCommunicationService;

  /* Main app file: launches the Angular framework inside Electron app */
  constructor(
    leappCoreService: LeappCoreService,
    mfaCodePrompter: MfaCodePromptService,
    awsAuthenticationService: AwsAuthenticationService,
    verificationWindowService: VerificationWindowService,
    public appService: AppService,
    private router: Router,
    private updaterService: UpdaterService,
    private windowService: WindowService,
    private electronService: ElectronService
  ) {
    leappCoreService.mfaCodePrompter = mfaCodePrompter;
    leappCoreService.awsAuthenticationService = awsAuthenticationService;
    leappCoreService.verificationWindowService = verificationWindowService;
    leappCoreService.windowService = windowService;
    leappCoreService.repository.createWorkspace();

    this.repository = leappCoreService.repository;
    this.fileService = leappCoreService.fileService;
    this.awsCoreService = leappCoreService.awsCoreService;
    this.loggingService = leappCoreService.loggingService;
    this.timerService = leappCoreService.timerService;
    this.sessionServiceFactory = leappCoreService.sessionFactory;
    this.workspaceService = leappCoreService.workspaceService;
    this.retroCompatibilityService = leappCoreService.retroCompatibilityService;
    this.rotationService = leappCoreService.rotationService;
    this.awsSsoIntegrationService = leappCoreService.awsSsoIntegrationService;
    this.awsSsoRoleService = leappCoreService.awsSsoRoleService;
    this.cliCommunicationService = leappCoreService.cliCommunicationService;

    this.setInitialColorSchema();
    this.setColorSchemaChangeEventListener();
  }

  async ngOnInit(): Promise<void> {
    this.awsSsoRoleService.setAwsIntegrationDelegate(this.awsSsoIntegrationService);

    // We get the right moment to set an hook to app close
    const ipcRenderer = this.electronService.ipcRenderer;
    ipcRenderer.on("app-close", () => {
      this.loggingService.logger("Preparing for closing instruction...", LoggerLevel.info, this);
      this.beforeCloseInstructions();
    });

    // Use ngx bootstrap 4
    setTheme("bs4");

    if (environment.production) {
      // Clear both info and warn message in production
      // mode without removing them from code actually
      console.warn = () => {};
      console.log = () => {};
    }

    // Prevent Dev Tool to show on production mode
    this.windowService.blockDevToolInProductionMode();

    // Create folders if missing
    this.updaterService.createFoldersIfMissing();

    // Before retrieving an actual copy of the workspace we
    // check and in case apply, our retro compatibility service
    if (this.retroCompatibilityService.isRetroPatchNecessary()) {
      await this.retroCompatibilityService.adaptOldWorkspaceFile();
    }

    if (this.retroCompatibilityService.isIntegrationPatchNecessary()) {
      await this.retroCompatibilityService.adaptIntegrationPatch();
    }

    let workspace;
    try {
      workspace = this.repository.getWorkspace();
    } catch {
      // eslint-disable-next-line max-len
      throw new LeappParseError(this, "We had trouble parsing your Leapp-lock.json file. It is either corrupt, obsolete, or with an error.");
    }

    // Check the existence of a pre-Leapp credential file and make a backup
    this.showCredentialBackupMessageIfNeeded();

    console.log(this.workspaceService.sessions);
    console.log(workspace.sessions);

    // All sessions start stopped when app is launched
    if (this.workspaceService.sessions.length > 0) {
      this.workspaceService.sessions.forEach((sess) => {
        const concreteSessionService = this.sessionServiceFactory.getSessionService(sess.type);
        concreteSessionService.stop(sess.sessionId);
      });
    }

    // Start Global Timer
    this.timerService.start(this.rotationService.rotate.bind(this.rotationService));

    // Launch Auto Updater Routines
    this.manageAutoUpdate();

    // Go to initial page if no sessions are already created or
    // go to the list page if is your second visit
    await this.router.navigate(["/dashboard"]);

    this.cliCommunicationService.startServer();
  }

  closeAllRightClickMenus(): void {
    this.appService.closeAllMenuTriggers();
  }

  /**
   * This is an hook on the closing app to remove credential file and force stop using them
   */
  private beforeCloseInstructions() {
    // Check if we are here
    this.loggingService.logger("Closing app with cleaning process...", LoggerLevel.info, this);

    // Stop all the sessions
    const sessions = this.repository.getSessions();
    sessions.forEach((s) => {
      s.status = SessionStatus.inactive;
    });
    this.repository.updateSessions(sessions);

    // We need the Try/Catch as we have a the possibility to call the method without sessions
    try {
      // Clean the config file
      this.awsCoreService.cleanCredentialFile();
    } catch (err) {
      this.loggingService.logger("No sessions to stop, skipping...", LoggerLevel.error, this, err.stack);
    }

    // Finally quit
    this.appService.quit();
  }

  /**
   * Show that we created a copy of original credential file if present in the system
   */
  private showCredentialBackupMessageIfNeeded() {
    // TODO: move this logic inside a service
    const oldAwsCredentialsPath = this.fileService.homeDir() + "/" + constants.credentialsDestination;
    const newAwsCredentialsPath = oldAwsCredentialsPath + ".leapp.bkp";
    const check =
      this.workspaceService.sessions.length === 0 &&
      this.fileService.existsSync(oldAwsCredentialsPath) &&
      !this.fileService.existsSync(newAwsCredentialsPath);

    this.loggingService.logger(`Check existing credential file: ${check}`, LoggerLevel.info, this);

    if (check) {
      this.fileService.renameSync(oldAwsCredentialsPath, newAwsCredentialsPath);
      this.fileService.writeFileSync(oldAwsCredentialsPath, "");
      this.appService.getDialog().showMessageBox({
        type: "info",
        icon: __dirname + "/assets/images/Leapp.png",
        // eslint-disable-next-line max-len
        message: "You had a previous credential file. We made a backup of the old one in the same directory before starting.",
      });
    } else if (!this.fileService.existsSync(this.awsCoreService.awsCredentialPath())) {
      this.fileService.writeFileSync(this.awsCoreService.awsCredentialPath(), "");
    }
  }

  /**
   * Launch Updater process
   *
   * @private
   */
  private manageAutoUpdate(): void {
    let savedVersion;

    try {
      savedVersion = this.updaterService.getSavedAppVersion();
    } catch (error) {
      savedVersion = this.updaterService.getCurrentAppVersion();
    }

    try {
      if (compareVersions(savedVersion, this.updaterService.getCurrentAppVersion()) <= 0) {
        // We always need to maintain this order: fresh <= saved <= online
        this.updaterService.updateVersionJson(this.updaterService.getCurrentAppVersion());
      }
    } catch (error) {
      this.updaterService.updateVersionJson(this.updaterService.getCurrentAppVersion());
    }

    const ipc = this.electronService.ipcRenderer;
    ipc.on("UPDATE_AVAILABLE", async (_, info) => {
      const releaseNote = await this.updaterService.getReleaseNote();
      this.updaterService.setUpdateInfo(info.version, info.releaseName, info.releaseDate, releaseNote);
      if (this.updaterService.isUpdateNeeded()) {
        this.updaterService.updateDialog();
        this.workspaceService.sessions = [...this.workspaceService.sessions];
        this.repository.updateSessions(this.workspaceService.sessions);
      }
    });
  }

  private setInitialColorSchema() {
    const workspace = this.repository.getWorkspace();
    if (workspace) {
      const colorTheme = workspace.colorTheme || constants.colorTheme;
      workspace.colorTheme = workspace.colorTheme || constants.colorTheme;
      if (colorTheme === constants.darkTheme) {
        document.querySelector("body").classList.add("dark-theme");
      } else if (colorTheme === constants.lightTheme) {
        document.querySelector("body").classList.remove("dark-theme");
      } else if (colorTheme === constants.systemDefaultTheme) {
        if (this.appService.isDarkMode()) {
          document.querySelector("body").classList.add("dark-theme");
        } else {
          document.querySelector("body").classList.remove("dark-theme");
        }
      }
    }
  }

  private setColorSchemaChangeEventListener() {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (this.repository.getWorkspace().colorTheme === constants.systemDefaultTheme) {
        if (this.appService.isDarkMode()) {
          document.querySelector("body").classList.add("dark-theme");
        } else {
          document.querySelector("body").classList.remove("dark-theme");
        }
      }
    });
  }
}
