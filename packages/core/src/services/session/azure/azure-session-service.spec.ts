import { afterAll, describe, expect, jest, test } from "@jest/globals";
import { AzureSessionService } from "./azure-session-service";
import { SessionType } from "../../../models/session-type";
import { AzureSession } from "../../../models/azure/azure-session";
import { SessionStatus } from "../../../models/session-status";
import { LoggedEntry, LogLevel } from "../../log-service";

describe("AzureSessionService", () => {
  afterAll(() => {
    jest.useRealTimers();
  });

  test("getDependantSessions", async () => {
    const azureSessionService = new AzureSessionService(null, null, null, null, null, null, null, null);
    const dependantSessions = azureSessionService.getDependantSessions(null);
    expect(dependantSessions).toEqual([]);
  });

  test("create", async () => {
    const sessionParams = {
      sessionName: "fakeSessionName",
      region: "fakeRegion",
      subscriptionId: "fakeSubscriptionId",
      tenantId: "fakeTenantId",
      azureIntegrationId: "fakeIntegrationId",
    };

    const repository = {
      addSession: jest.fn((session: any) => {
        expect(session).toMatchObject(sessionParams);
        expect(session.type).toBe(SessionType.azure);
      }),
      getSessions: () => ["session1"],
    } as any;
    const sessionNotifier = { setSessions: jest.fn() } as any;
    const azureSessionService = new AzureSessionService(sessionNotifier, repository, null, null, null, null, null, null);
    await azureSessionService.create(sessionParams);
    expect(repository.addSession).toHaveBeenCalled();
    expect(sessionNotifier.setSessions).toHaveBeenCalledWith(["session1"]);
  });

  test("rotate, token still valid", async () => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(new Date(2022, 12, 1, 10, 0, 0, 0));
    const sessionTokenExpiration = new Date(2022, 12, 1, 10, 21, 0, 0).toISOString();
    const repository = {
      getSessionById: () => ({ integrationId: "fakeIntegrationId" }),
      getAzureIntegration: () => ({ tokenExpiration: sessionTokenExpiration }),
    } as any;

    const azureSessionService = new AzureSessionService(null, repository, null, null, null, null, null, null);
    azureSessionService.start = jest.fn(async () => null);

    await azureSessionService.rotate("fakeId");
    expect(azureSessionService.start).not.toHaveBeenCalled();
  });

  test("rotate, token should be rotated", async () => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(new Date(2022, 12, 1, 10, 0, 0, 1));
    const sessionTokenExpiration = new Date(2022, 12, 1, 10, 21, 0, 0).toISOString();
    const repository = {
      getSessionById: () => ({ integrationId: "fakeIntegrationId" }),
      getAzureIntegration: () => ({ tokenExpiration: sessionTokenExpiration }),
    } as any;

    const azureSessionService = new AzureSessionService(null, repository, null, null, null, null, null, null);
    azureSessionService.start = jest.fn(async () => null);

    await azureSessionService.rotate("fakeId");
    expect(azureSessionService.start).toHaveBeenCalled();
  });

  test("stop, 'az logout' command is executed when profile contains less than 2 subscriptions", () => {
    const azureSession = new AzureSession("fake-session-name", "fake-region", "fake-subscription-id", "fake-tenant-id", "fake-azure-integration-id");
    azureSession.status = SessionStatus.active;

    const repository = {
      getSessionById: () => ({}),
      getSessions: () => [azureSession],
      updateSessions: () => {},
      getAzureIntegration: () => ({}),
      updateAzureIntegration: () => {},
    } as any;

    const sessionNotifier = {
      setSessions: () => {},
    } as any;

    const executeService = {
      execute: () => {
        expect(azureSession.status).toEqual(SessionStatus.pending);
      },
    } as any;

    const azurePersistenceService = {
      loadProfile: () => ({ subscriptions: [{}] }),
    } as any;

    const logger = {
      log: (loggedEntry: LoggedEntry) => {
        console.log(loggedEntry);
      },
    } as any;

    const azureSessionService = new AzureSessionService(
      sessionNotifier,
      repository,
      null,
      executeService,
      null,
      null,
      azurePersistenceService,
      logger
    );

    azureSessionService.stop(azureSession.sessionId);
  });

  test("stop, logService's log is called if an error is thrown inside try catch block", async () => {
    const azureSession = new AzureSession("fake-session-name", "fake-region", "fake-subscription-id", "fake-tenant-id", "fake-azure-integration-id");
    azureSession.status = SessionStatus.active;

    const error = new Error("fake-error");

    const repository = {
      getSessionById: () => {
        throw error;
      },
      getSessions: () => ["fakeId"],
    } as any;

    const logService = {
      log: jest.fn(() => {}),
    } as any;

    const azureSessionService = new AzureSessionService(null, repository, null, null, null, null, null, logService);

    (azureSessionService as any).sessionLoading = jest.fn();
    await azureSessionService.stop(azureSession.sessionId);

    expect(logService.log).toHaveBeenNthCalledWith(1, new LoggedEntry(error.message, this, LogLevel.warn));
  });

  test("start, with integration token not expired, one session available", async () => {
    const sessionId = "fake-session-id";
    const session = {
      sessionId,
      azureIntegrationId: "fakeIntegrationId",
      subscriptionId: "fakeSubscriptionId",
      type: SessionType.azure,
      region: "fakeRegion",
    } as AzureSession;

    const repository = {
      getSessionById: jest.fn(() => session),
      getSessions: () => [session],
      getAzureIntegration: () => ({ tokenExpiration: new Date().toISOString() }),
    } as any;

    const executeService = {
      execute: jest.fn(async () => {}),
    } as any;

    const azureSessionService = new AzureSessionService(null, repository, null, executeService, null, null, null, null);
    (azureSessionService as any).stopAllOtherSessions = jest.fn(async () => {});
    (azureSessionService as any).sessionLoading = jest.fn();
    (azureSessionService as any).updateProfiles = jest.fn(async () => {});
    (azureSessionService as any).sessionActivated = jest.fn(async () => {});

    await azureSessionService.start(sessionId);

    expect(repository.getSessionById).toHaveBeenCalledTimes(1);
    expect(repository.getSessionById).toHaveBeenCalledWith(sessionId);
    expect((azureSessionService as any).stopAllOtherSessions).toHaveBeenCalledWith(sessionId);
    expect((azureSessionService as any).sessionLoading).toHaveBeenCalledWith(sessionId);
    expect(executeService.execute).toHaveBeenCalledWith("az configure --default location=fakeRegion");

    expect((azureSessionService as any).updateProfiles).toHaveBeenCalledWith("fakeIntegrationId", [session.subscriptionId], "fakeSubscriptionId");
    expect((azureSessionService as any).sessionActivated).toHaveBeenCalledWith(sessionId, undefined);
  });

  test("start, with integration token undefined", async () => {
    const sessionId = "fake-session-id";
    const session = {
      sessionId,
      azureIntegrationId: "fakeIntegrationId",
      subscriptionId: "fakeSubscriptionId",
      tenantId: "fakeTenantId",
      type: SessionType.azure,
    } as AzureSession;

    const repository = {
      getSessionById: () => session,
      getSessions: () => [],
      getAzureIntegration: () => ({
        tokenExpiration: undefined,
        id: "fakeIntId",
        alias: "fakeIntAlias",
        tenantId: "fakeIntTenantId",
        region: "fakeIntRegion",
        isOnline: "fakeIntIsOnline",
      }),
      updateAzureIntegration: jest.fn(() => {}),
    } as any;

    const executeService = {
      execute: jest.fn(async () => {}),
    } as any;

    const msalTokenCache = {
      ["AccessToken"]: {
        tokenKey1: { realm: "wrongTenantId" },
        tokenKey2: { realm: "fakeTenantId", ["expires_on"]: "fakeExpiresOn" },
      },
    };

    const azurePersistenceService = {
      loadMsalCache: jest.fn(async () => msalTokenCache),
    } as any;

    const azureSessionService = new AzureSessionService(null, repository, null, executeService, null, null, azurePersistenceService, null);
    (azureSessionService as any).stopAllOtherSessions = async () => {};
    (azureSessionService as any).sessionLoading = () => {};
    (azureSessionService as any).updateProfiles = async () => {};
    (azureSessionService as any).sessionActivated = () => {};

    (azureSessionService as any).restoreSecretsFromKeychain = jest.fn(async () => {});
    (azureSessionService as any).moveRefreshTokenToKeychain = jest.fn(async () => {});
    (azureSessionService as any).getAccessTokenExpiration = jest.fn(async () => {});

    await azureSessionService.start(sessionId);

    expect((azureSessionService as any).restoreSecretsFromKeychain).toHaveBeenCalledWith("fakeIntegrationId");
    expect(executeService.execute).toHaveBeenNthCalledWith(2, "az account get-access-token --subscription fakeSubscriptionId", undefined, true);
    expect(repository.updateAzureIntegration).toHaveBeenCalledWith(
      "fakeIntId",
      "fakeIntAlias",
      "fakeIntTenantId",
      "fakeIntRegion",
      "fakeIntIsOnline",
      "fakeExpiresOn"
    );
    expect((azureSessionService as any).moveRefreshTokenToKeychain).toHaveBeenCalledWith(msalTokenCache, "fakeIntegrationId", "fakeTenantId");
    expect((azureSessionService as any).getAccessTokenExpiration).toHaveBeenCalledWith(msalTokenCache, "fakeTenantId");
  });

  // TODO: review this test and add currentTime > tokenExpiration + throw case
  test("start, default location is set once the session is in pending state", async () => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(new Date(2022, 12, 1, 10, 0, 0, 0));
    const tokenExpiration = new Date(2022, 12, 1, 11, 0, 0, 0).toISOString();

    const azureSession = new AzureSession("fake-session-name", "fake-region", "fake-subscription-id", "fake-tenant-id", "fake-azure-integration-id");
    azureSession.status = SessionStatus.inactive;

    const fakeAzureIntegrationId = "fake-azure-integration-id";

    const repository = {
      getSessionById: jest.fn(() => ({ azureIntegrationId: fakeAzureIntegrationId })),
      getSessions: () => [azureSession],
      getAzureIntegration: () => ({ tokenExpiration }),
      updateSessions: () => {},
    } as any;

    const executeService = {
      execute: jest.fn(() => {
        expect(azureSession.status).not.toEqual(SessionStatus.inactive);
        expect(azureSession.status).toEqual(SessionStatus.pending);
        expect(azureSession.status).not.toEqual(SessionStatus.active);
      }),
    } as any;

    const azureSessionService = new AzureSessionService(null, repository, null, executeService, null, null, null, null);
    (azureSessionService as any).stopAllOtherSessions = () => {};
    (azureSessionService as any).updateProfiles = () => {};
    (azureSessionService as any).stopAllOtherSessions = jest.fn();

    await azureSessionService.start(azureSession.sessionId);
  });

  test("start, updateProfiles is invoked with expected parameters", async () => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(new Date(2022, 12, 1, 10, 0, 0, 0));
    const tokenExpiration = new Date(2022, 12, 1, 11, 0, 0, 0).toISOString();

    const azureSession = new AzureSession("fake-session-name", "fake-region", "fake-subscription-id", "fake-tenant-id", "fake-azure-integration-id");
    azureSession.status = SessionStatus.inactive;

    const repository = {
      getSessionById: () => azureSession,
      getSessions: () => [azureSession],
      getAzureIntegration: () => ({ tokenExpiration }),
      updateSessions: () => {},
    } as any;

    const executeService = {
      execute: jest.fn(() => {}),
    } as any;

    const azureSessionService = new AzureSessionService(null, repository, null, executeService, null, null, null, null);
    (azureSessionService as any).stopAllOtherSessions = () => {};
    (azureSessionService as any).updateProfiles = jest.fn();
    (azureSessionService as any).stopAllOtherSessions = () => {};

    await azureSessionService.start(azureSession.sessionId);

    const expectedSubscriptionIdsToStart = [azureSession.subscriptionId];

    expect((azureSessionService as any).updateProfiles).toHaveBeenCalledTimes(1);
    expect((azureSessionService as any).updateProfiles).toHaveBeenCalledWith(
      azureSession.azureIntegrationId,
      expectedSubscriptionIdsToStart,
      azureSession.subscriptionId
    );
  });

  /*test("start, loadMsalCache and getAzureSecrets are invoked once and that saveMsalCache is invoked with the expected msalTokenCache object", async () => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(new Date(2022, 12, 1, 10, 0, 0, 0));
    const tokenExpiration = new Date(2022, 12, 1, 9, 0, 0, 0).toISOString();

    const azureSession = new AzureSession("fake-session-name", "fake-region", "fake-subscription-id", "fake-tenant-id", "fake-azure-integration-id");
    azureSession.status = SessionStatus.inactive;

    const repository = {
      getSessionById: () => azureSession,
      getSessions: () => [azureSession],
      getAzureIntegration: () => ({ tokenExpiration }),
      updateSessions: () => {},
    } as any;

    const executeService = {
      execute: jest.fn(() => {}),
    } as any;

    const azurePersistenceService = {
      loadMsalCache: jest.fn(),
      getAzureSecrets: jest.fn(() => {
        return {
          account: []
        };
      }),
      saveMsalCache: jest.fn(),
    } as any;

    const azureSessionService = new AzureSessionService(null, repository, null, executeService, null, null, null, null);
    (azureSessionService as any).stopAllOtherSessions = () => {};
    (azureSessionService as any).updateProfiles = () => {};
    (azureSessionService as any).stopAllOtherSessions = () => {};

    await azureSessionService.start(azureSession.sessionId);

  });*/
});
