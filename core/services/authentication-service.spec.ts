import { describe, test, expect } from "@jest/globals";
import { LeappParseError } from "../errors/leapp-parse-error";
import { AuthenticationService } from "./authentication-service";
import { CloudProviderType } from "../models/cloud-provider-type";

describe("AuthenticationService", () => {
  test("isAuthenticationUrl", () => {
    const service = new AuthenticationService();

    expect(service.isAuthenticationUrl(CloudProviderType.aws, "https://XX.onelogin.com/XX")).toBe(true);
    expect(service.isAuthenticationUrl(CloudProviderType.aws, "http://XX.onelogin.com/XX")).toBe(false);

    expect(service.isAuthenticationUrl(CloudProviderType.aws, "https://XX/adfs/ls/idpinitiatedsignonXXloginToRp=urn:amazon:webservicesXXX")).toBe(
      true
    );
    expect(service.isAuthenticationUrl(CloudProviderType.aws, "https://XX/adfs/ls/idpinitiatedsignonXX")).toBe(false);

    expect(service.isAuthenticationUrl(CloudProviderType.aws, "https://XX.okta.com/XX")).toBe(true);
    expect(service.isAuthenticationUrl(CloudProviderType.aws, "https://XX.okta.com")).toBe(false);

    expect(service.isAuthenticationUrl(CloudProviderType.aws, "https://accounts.google.com/ServiceLoginXX")).toBe(true);
    expect(service.isAuthenticationUrl(CloudProviderType.aws, "https://accounts.google.com")).toBe(false);

    expect(service.isAuthenticationUrl(CloudProviderType.aws, "https://login.microsoftonline.com/XX/oauth2/authorizeXXXX")).toBe(true);
    expect(service.isAuthenticationUrl(CloudProviderType.aws, "https://login.microsoftonline.com")).toBe(false);

    expect(service.isAuthenticationUrl(CloudProviderType.aws, "https://signin.aws.amazon.com/saml")).toBe(false);
  });

  test("isSamlAssertionUrl", () => {
    const authenticationService = new AuthenticationService();

    expect(authenticationService.isSamlAssertionUrl(CloudProviderType.aws, "https://signin.aws.amazon.com/saml")).toBe(true);
    expect(authenticationService.isSamlAssertionUrl(CloudProviderType.aws, "https://signin.aws.amazon.com/saml?XX")).toBe(true);
    expect(authenticationService.isSamlAssertionUrl(CloudProviderType.aws, "http://signin.aws.amazon.com/saml")).toBe(false);
  });

  test("extractAwsSamlResponse", () => {
    const responseHookDetails = {
      uploadData: [{ bytes: "SAMLResponse=ABCDEFGHIJKLMNOPQRSTUVWXYZ&RelayState=abcdefghijklmnopqrstuvwxyz" }],
    };

    const authenticationService = new AuthenticationService();
    const awsSamlResponse = authenticationService.extractAwsSamlResponse(responseHookDetails as any);
    expect(awsSamlResponse).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });

  test("extractAwsSamlResponse - error", () => {
    const responseHookDetails = {
      uploadData: [
        {
          bytes: {
            toString: jest.fn(() => {
              throw new Error("");
            }),
          },
        },
      ],
    };

    const authenticationService = new AuthenticationService();
    expect(() => authenticationService.extractAwsSamlResponse(responseHookDetails as any)).toThrow(new LeappParseError(authenticationService, ""));
  });
});
