import { LeappCommand } from "../../leapp-command";
import { Config } from "@oclif/core/lib/config/config";
import { Session } from "@noovolari/leapp-core/models/session";
import { SessionStatus } from "@noovolari/leapp-core/models/session-status";

export default class StartSession extends LeappCommand {
  static description = "Start a session";

  static examples = [`$leapp session start`];

  constructor(argv: string[], config: Config) {
    super(argv, config);
  }

  async run(): Promise<void> {
    try {
      const selectedSession = await this.selectSession();
      await this.startSession(selectedSession);
    } catch (error) {
      this.error(error instanceof Error ? error.message : `Unknown error: ${error}`);
    }
  }

  async startSession(session: Session): Promise<void> {
    const sessionService = this.leappCliService.sessionFactory.getSessionService(session.type);
    process.on("SIGINT", () => {
      sessionService.sessionDeactivated(session.sessionId);
      process.exit(0);
    });
    await sessionService.start(session.sessionId);
    await this.leappCliService.desktopAppRemoteProcedures.refreshSessions();
    this.log("session started");
  }

  async selectSession(): Promise<Session> {
    const availableSessions = this.leappCliService.repository.getSessions().filter((session: Session) => session.status === SessionStatus.inactive);
    if (availableSessions.length === 0) {
      throw new Error("no sessions available");
    }
    const answer: any = await this.leappCliService.inquirer.prompt([
      {
        name: "selectedSession",
        message: "select a session",
        type: "list",
        choices: availableSessions.map((session: any) => ({ name: session.sessionName, value: session })),
      },
    ]);
    return answer.selectedSession;
  }
}
