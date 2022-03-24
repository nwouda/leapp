import { BehaviorSubject, Observable } from "rxjs";
import { AwsSsoIntegration } from "../models/aws-sso-integration";
import { Repository } from "./repository";
import { Session } from "../models/session";
import { SessionStatus } from "../models/session-status";
import { SessionType } from "../models/session-type";
import { AwsIamRoleChainedSession } from "../models/aws-iam-role-chained-session";
import { ISessionNotifier } from "../interfaces/i-session-notifier";

export class WorkspaceService implements ISessionNotifier {
  // Expose the observable$ part of the _sessions subject (read only stream)
  readonly sessions$: Observable<Session[]>;
  readonly integrations$: Observable<AwsSsoIntegration[]>;

  // - We set the initial state in BehaviorSubject's constructor
  // - Nobody outside the Store should have access to the BehaviorSubject
  //   because it has the write rights
  // - Writing to state should be handled by specialized Store methods
  // - Create one BehaviorSubject per store entity, for example if you have
  //   create a new BehaviorSubject for it, as well as the observable$, and getters/setters
  private readonly _sessions;
  private readonly _integrations;

  constructor(private repository: Repository) {
    this._sessions = new BehaviorSubject<Session[]>([]);
    this._integrations = new BehaviorSubject<AwsSsoIntegration[]>([]);
    this.sessions$ = this._sessions.asObservable();
    this.integrations$ = this._integrations.asObservable();

    this.sessions = this.repository.getSessions();
  }

  // the getter will return the last value emitted in _sessions subject
  get sessions(): Session[] {
    return this._sessions.getValue();
  }

  // assigning a value to this.sessions will push it onto the observable
  // and down to all of its subscribers (ex: this.sessions = [])
  set sessions(sessions: Session[]) {
    this._sessions.next(sessions);
  }

  getSessions(): Session[] {
    return this._sessions.getValue();
  }

  getSessionById(sessionId: string): Session {
    const sessionFiltered = this.sessions.find((session) => session.sessionId === sessionId);
    return sessionFiltered ? sessionFiltered : null;
  }

  setSessions(sessions: Session[]): void {
    this._sessions.next(sessions);
  }

  addSession(session: Session): void {
    // we assign a new copy of session by adding a new session to it
    this.sessions = [...this.sessions, session];
  }

  deleteSession(sessionId: string): void {
    this.sessions = this.sessions.filter((session) => session.sessionId !== sessionId);
  }

  getIntegrations(): AwsSsoIntegration[] {
    return this._integrations.getValue();
  }

  setIntegrations(integrations: AwsSsoIntegration[]): void {
    this._integrations.next(integrations);
  }

  listPending(): Session[] {
    return this.sessions.length > 0 ? this.sessions.filter((session) => session.status === SessionStatus.pending) : [];
  }

  listActive(): Session[] {
    return this.sessions.length > 0 ? this.sessions.filter((session) => session.status === SessionStatus.active) : [];
  }

  listAwsSsoRoles(): Session[] {
    return this.sessions.length > 0 ? this.sessions.filter((session) => session.type === SessionType.awsSsoRole) : [];
  }

  listIamRoleChained(parentSession?: Session): Session[] {
    let childSession = this.sessions.length > 0 ? this.sessions.filter((session) => session.type === SessionType.awsIamRoleChained) : [];
    if (parentSession) {
      childSession = childSession.filter((session) => (session as AwsIamRoleChainedSession).parentSessionId === parentSession.sessionId);
    }
    return childSession;
  }

  updateSession(sessionId: string, session: Session): void {
    const sessions = this.sessions;
    const index = sessions.findIndex((sess) => sess.sessionId === sessionId);
    if (index > -1) {
      this.sessions[index] = session;
      this.sessions = [...this.sessions];
    }
  }

  listInActive(): Session[] {
    return this.sessions.length > 0 ? this.sessions.filter((session) => session.status === SessionStatus.inactive) : [];
  }

  listAssumable(): Session[] {
    return this.sessions.length > 0 ? this.sessions.filter((session) => session.type !== SessionType.azure) : [];
  }
}
