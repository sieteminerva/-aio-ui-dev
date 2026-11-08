import { describe, expect, it } from "vitest";

import {
  EMPTY_TABLE,
  detectDelimiter,
  parseTableFile,
  parseTableRecords,
  parseTableText,
  splitCsvRows,
} from "@aio-ui/utilities/parseTableFile";

/**
 * Pure text in, plain object out — no DOM, no form, no uploader. That is the point of
 * moving this out of `FileUploader`: the transformation can be pinned down directly.
 */
describe("detectDelimiter", () => {
  it("picks the separator that wins outside quotes", () => {
    expect(detectDelimiter("a;b;c")).toBe(";");
    expect(detectDelimiter("a,b,c")).toBe(",");
  });

  it("does not count separators inside quoted cells", () => {
    expect(detectDelimiter('"Jakarta; Barat",Umur,Kota')).toBe(",");
  });
});

describe("splitCsvRows", () => {
  it("keeps a quoted cell with a newline and a delimiter intact", () => {
    const rows = splitCsvRows('name,address\n"Budi, S.T.\nBlok M",Jakarta', ",");

    expect(rows).toEqual([
      ["name", "address"],
      ["Budi, S.T.\nBlok M", "Jakarta"],
    ]);
  });

  it("treats a doubled quote as a literal quote", () => {
    expect(splitCsvRows('a\n"say ""hi"""', ",")).toEqual([["a"], ['say "hi"']]);
  });

  it("drops blank rows", () => {
    expect(splitCsvRows("a,b\n,\nc,d", ",")).toEqual([["a", "b"], ["c", "d"]]);
  });
});

describe("parseTableText", () => {
  it("returns header + body with numeric casts", () => {
    const table = parseTableText("Produk,Harga\nKaos,85000\nMug,75000");

    expect(table.header).toEqual(["Produk", "Harga"]);
    expect(table.body).toEqual([["Kaos", 85000], ["Mug", 75000]]);
    expect(table.footer).toBeNull();
  });

  it("handles semicolon files", () => {
    const table = parseTableText("Produk;Harga\nKaos;85000");

    expect(table.header).toEqual(["Produk", "Harga"]);
    expect(table.body).toEqual([["Kaos", 85000]]);
  });

  it("trims cells and keeps text values as text", () => {
    const table = parseTableText("a , b\n  x  , 007");

    expect(table.header).toEqual(["a", "b"]);
    expect(table.body).toEqual([["x", 7]]);
  });

  it("returns an empty table for empty input", () => {
    expect(parseTableText("")).toEqual(EMPTY_TABLE);
    expect(parseTableText("   \n  ")).toEqual(EMPTY_TABLE);
  });
});

describe("parseTableRecords", () => {
  it("takes the header from the first record's keys", () => {
    const table = parseTableRecords([{ nama: "Kaos", harga: 85000 }, { nama: "Mug", harga: 75000 }]);

    expect(table.header).toEqual(["nama", "harga"]);
    expect(table.body).toEqual([["Kaos", 85000], ["Mug", 75000]]);
  });

  it("returns an empty table for anything that is not a record array", () => {
    expect(parseTableRecords(null)).toEqual(EMPTY_TABLE);
    expect(parseTableRecords([])).toEqual(EMPTY_TABLE);
    expect(parseTableRecords("nope")).toEqual(EMPTY_TABLE);
  });
});

describe("parseTableFile", () => {
  it("reads a csv file by its extension", async () => {
    const file = new File(["a,b\n1,2"], "data.csv", { type: "text/csv" });
    const table = await parseTableFile(file);

    expect(table.header).toEqual(["a", "b"]);
    expect(table.body).toEqual([[1, 2]]);
  });

  it("reads a json file by its extension", async () => {
    const file = new File(['[{"a":1}]'], "data.json", { type: "application/json" });

    expect((await parseTableFile(file)).body).toEqual([[1]]);
  });

  it("returns an empty table for an unsupported extension or broken json", async () => {
    expect(await parseTableFile(new File(["x"], "notes.txt"))).toEqual(EMPTY_TABLE);
    expect(await parseTableFile(new File(["{oops"], "data.json"))).toEqual(EMPTY_TABLE);
  });
});
