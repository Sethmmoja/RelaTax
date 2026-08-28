import { GoogleDriveConnector } from "../src/cloud-drive/google-drive-connector.service";

/**
 * The queries this connector builds are the whole security boundary between one
 * client's documents and another's, so they're asserted directly rather than
 * inferred from a happy-path result.
 */

const listMock = jest.fn();
const getTokenMock = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: class {
        getToken = (...args: unknown[]) => getTokenMock(...args);
        setCredentials = () => undefined;
      }
    },
    drive: () => ({ files: { list: (...args: unknown[]) => listMock(...args) } })
  }
}));

/** The `q` string Drive was asked for on the nth call. */
const queryFromCall = (n: number): string => listMock.mock.calls[n][0].q;

describe("GoogleDriveConnector folder resolution", () => {
  let connector: GoogleDriveConnector;

  beforeEach(() => {
    listMock.mockReset();
    getTokenMock.mockReset();
    getTokenMock.mockResolvedValue({
      tokens: { access_token: "at", refresh_token: "rt", expiry_date: Date.now() + 3600_000 }
    });
    connector = new GoogleDriveConnector();
  });

  it("binds the business to its own subfolder, not the shared parent", async () => {
    listMock
      .mockResolvedValueOnce({ data: { files: [{ id: "parent-id", name: "RelaTax Reports" }] } })
      .mockResolvedValueOnce({ data: { files: [{ id: "acme-id", name: "Acme Foods Ltd" }] } });

    const tokens = await connector.exchangeCodeForTokens("code", { id: "b1", name: "Acme Foods Ltd" });

    // The subfolder's id — binding to "parent-id" would import every client's
    // documents into this client's account.
    expect(tokens.folderId).toBe("acme-id");
    expect(tokens.folderName).toBe("RelaTax Reports/Acme Foods Ltd");

    // The second lookup must be scoped to the parent, or a same-named folder
    // elsewhere in the Drive could satisfy it.
    expect(queryFromCall(1)).toContain("'parent-id' in parents");
    expect(queryFromCall(1)).toContain("name = 'Acme Foods Ltd'");
  });

  it("refuses to connect when the business has no subfolder yet", async () => {
    listMock
      .mockResolvedValueOnce({ data: { files: [{ id: "parent-id", name: "RelaTax Reports" }] } })
      .mockResolvedValueOnce({ data: { files: [] } });

    await expect(
      connector.exchangeCodeForTokens("code", { id: "b1", name: "Zuri Logistics" })
    ).rejects.toThrow(/No "Zuri Logistics" subfolder found/);
  });

  it("reports the missing parent folder before looking for a subfolder", async () => {
    listMock.mockResolvedValueOnce({ data: { files: [] } });

    await expect(
      connector.exchangeCodeForTokens("code", { id: "b1", name: "Acme Foods Ltd" })
    ).rejects.toThrow(/No "RelaTax Reports" folder found/);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("escapes quotes in a business name so the query can't be broken out of", async () => {
    listMock
      .mockResolvedValueOnce({ data: { files: [{ id: "parent-id", name: "RelaTax Reports" }] } })
      .mockResolvedValueOnce({ data: { files: [{ id: "kids-id", name: "Kid's Books" }] } });

    await connector.exchangeCodeForTokens("code", { id: "b1", name: "Kid's Books" });

    const q = queryFromCall(1);
    expect(q).toContain("name = 'Kid\\'s Books'");
    // The apostrophe must not close the quoted term early.
    expect(q).not.toContain("name = 'Kid's Books'");
  });
});
