/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { assert } from "chai";
import { Format, FormatterSpec, Parser, ParseResult, ParserSpec, QuantityStatus, UnitConversionSpec, UnitProps } from "@bentley/imodeljs-quantity";
import { FormatterParserSpecsProvider, QuantityFormatter, QuantityType } from "../QuantityFormatter";

async function didThrowAsync(f: () => Promise<any>): Promise<boolean> {
  try {
    await f();

  } catch (e) {
    return true;

  }
  return false;
}

function withinTolerance(x: number, y: number, tolerance?: number): boolean {
  const tol: number = undefined !== tolerance ? tolerance : 0.1e-6;
  const z = x - y;
  return z >= -tol && z <= tol;
}

describe("Quantity formatter", async () => {
  let quantityFormatter: QuantityFormatter;
  beforeEach(async () => {
    quantityFormatter = new QuantityFormatter();
    await quantityFormatter.loadFormatAndParsingMaps(true);
  });

  it("Length", async () => {
    const expected = `405'-0 1/2"`;
    const newFormatterSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Length);

    const actual = quantityFormatter.formatQuantity(123.456, newFormatterSpec);
    assert.equal(actual, expected);
  });

  it("Set and use length override format", async () => {
    const overrideLengthAndCoordinateEntry = {
      metric: {
        composite: {
          includeZero: true,
          spacer: " ",
          units: [{ label: "cm", name: "Units.CM" }],
        },
        formatTraits: ["keepSingleZero", "showUnitLabel"],
        precision: 4,
        type: "Decimal",
      },
      imperial: {
        composite: {
          includeZero: true,
          spacer: " ",
          units: [{ label: "in", name: "Units.IN" }],
        },
        formatTraits: ["keepSingleZero", "showUnitLabel"],
        precision: 4,
        type: "Decimal",
      },
    };

    const metricFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Length, false);
    const metricFormattedValue = quantityFormatter.formatQuantity(1.5, metricFormatSpec);
    assert.equal(metricFormattedValue, "1.5 m");

    const imperialFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Length, true);
    const imperialFormattedValue = quantityFormatter.formatQuantity(1.5, imperialFormatSpec);
    assert.equal(imperialFormattedValue, `4'-11"`);

    await quantityFormatter.setOverrideFormats(QuantityType.Length, overrideLengthAndCoordinateEntry);
    const overrideMetricFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Length, false);
    const overrideMetricFormattedValue = quantityFormatter.formatQuantity(1.5, overrideMetricFormatSpec);
    assert.equal(overrideMetricFormattedValue, "150 cm");

    const overrideImperialFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Length, true);
    const overrideImperialFormattedValue = quantityFormatter.formatQuantity(1.5, overrideImperialFormatSpec);
    assert.equal(overrideImperialFormattedValue, "59.0551 in");

    const overrideImperialParserSpec = await quantityFormatter.getParserSpecByQuantityType(QuantityType.Length, true);
    const overrideValueInMeters1 = quantityFormatter.parseIntoQuantityValue(`48"`, overrideImperialParserSpec);
    const overrideValueInMeters2 = quantityFormatter.parseIntoQuantityValue(`48 in`, overrideImperialParserSpec);
    const overrideValueInMeters3 = quantityFormatter.parseIntoQuantityValue(`4 ft`, overrideImperialParserSpec);
    assert(withinTolerance(overrideValueInMeters1.value!, 1.2192));
    assert(withinTolerance(overrideValueInMeters1.value!, overrideValueInMeters2.value!));
    assert(withinTolerance(overrideValueInMeters3.value!, overrideValueInMeters2.value!));
  });

  it("Set and use coordinate and length overrides format (Survey Feet)", async () => {
    const overrideLengthAndCoordinateEntry = {
      metric: {
        composite: {
          includeZero: true,
          spacer: " ",
          units: [{ label: "m", name: "Units.M" }],
        },
        formatTraits: ["keepSingleZero", "showUnitLabel"],
        precision: 4,
        type: "Decimal",
      },
      imperial: {
        composite: {
          includeZero: true,
          spacer: " ",
          units: [{ label: "ft (US Survey)", name: "Units.SURVEY_FT" }],
        },
        formatTraits: ["keepSingleZero", "showUnitLabel"],
        precision: 4,
        type: "Decimal",
      },
    };

    let metricFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Coordinate, false);
    let metricFormattedValue = quantityFormatter.formatQuantity(100000.0, metricFormatSpec);
    assert.equal(metricFormattedValue, "100000 m");

    let imperialFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Coordinate, true);
    let imperialFormattedValue = quantityFormatter.formatQuantity(100000.0, imperialFormatSpec);
    assert.equal(imperialFormattedValue, "328083.99 ft");

    await quantityFormatter.setOverrideFormats(QuantityType.Length, overrideLengthAndCoordinateEntry);
    await quantityFormatter.setOverrideFormats(QuantityType.Coordinate, overrideLengthAndCoordinateEntry);

    let overrideMetricFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Length, false);
    let overrideMetricFormattedValue = quantityFormatter.formatQuantity(100000.0, overrideMetricFormatSpec);
    assert.equal(overrideMetricFormattedValue, "100000 m");

    overrideMetricFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Coordinate, false);
    overrideMetricFormattedValue = quantityFormatter.formatQuantity(100000.0, overrideMetricFormatSpec);
    assert.equal(overrideMetricFormattedValue, "100000 m");

    let overrideImperialFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Length, true);
    let overrideImperialFormattedValue = quantityFormatter.formatQuantity(100000.0, overrideImperialFormatSpec);
    assert.equal(overrideImperialFormattedValue, "328083.3333 ft (US Survey)");

    overrideImperialFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Coordinate, true);
    overrideImperialFormattedValue = quantityFormatter.formatQuantity(100000.0, overrideImperialFormatSpec);
    assert.equal(overrideImperialFormattedValue, "328083.3333 ft (US Survey)");

    let overrideImperialParserSpec = await quantityFormatter.getParserSpecByQuantityType(QuantityType.Length, true);
    let overrideValueInMeters1 = quantityFormatter.parseIntoQuantityValue("328083.333333333 ft (US Survey)", overrideImperialParserSpec);
    let overrideValueInMeters2 = quantityFormatter.parseIntoQuantityValue("328083.333333333", overrideImperialParserSpec);
    assert(withinTolerance(overrideValueInMeters1.value!, 100000));
    assert(withinTolerance(overrideValueInMeters1.value!, overrideValueInMeters2.value!));

    overrideImperialParserSpec = await quantityFormatter.getParserSpecByQuantityType(QuantityType.Coordinate, true);
    overrideValueInMeters1 = quantityFormatter.parseIntoQuantityValue("328083.333333333 ft (US Survey)", overrideImperialParserSpec);
    overrideValueInMeters2 = quantityFormatter.parseIntoQuantityValue("328083.333333333", overrideImperialParserSpec);
    assert(withinTolerance(overrideValueInMeters1.value!, 100000));
    assert(withinTolerance(overrideValueInMeters1.value!, overrideValueInMeters2.value!));

    await quantityFormatter.clearAllOverrideFormats();
    metricFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Coordinate, false);
    metricFormattedValue = quantityFormatter.formatQuantity(100000.0, metricFormatSpec);
    assert.equal(metricFormattedValue, "100000 m");

    imperialFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Coordinate, true);
    imperialFormattedValue = quantityFormatter.formatQuantity(100000.0, imperialFormatSpec);
    assert.equal(imperialFormattedValue, "328083.99 ft");
  });

  it("Set and use area overrides format (Survey Feet)", async () => {
    const overrideEntry = {
      metric: {
        composite: {
          includeZero: true,
          spacer: " ",
          units: [{ label: "m²", name: "Units.SQ_M" }],
        },
        formatTraits: ["keepSingleZero", "showUnitLabel"],
        precision: 4,
        type: "Decimal",
      },
      imperial: {
        composite: {
          includeZero: true,
          spacer: " ",
          units: [{ label: "ft² (US Survey)", name: "Units.SQ_SURVEY_FT" }],
        },
        formatTraits: ["keepSingleZero", "showUnitLabel"],
        precision: 4,
        type: "Decimal",
      },
    };

    let metricFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Area, false);
    let metricFormattedValue = quantityFormatter.formatQuantity(100000.0, metricFormatSpec);
    assert.equal(metricFormattedValue, "100000 m²");

    let imperialFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Area, true);
    let imperialFormattedValue = quantityFormatter.formatQuantity(100000.0, imperialFormatSpec);
    assert.equal(imperialFormattedValue, "1076391.0417 ft²");

    await quantityFormatter.setOverrideFormats(QuantityType.Area, overrideEntry);

    const overrideMetricFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Area, false);
    const overrideMetricFormattedValue = quantityFormatter.formatQuantity(100000.0, overrideMetricFormatSpec);
    assert.equal(overrideMetricFormattedValue, "100000 m²");

    const overrideImperialFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Area, true);
    const overrideImperialFormattedValue = quantityFormatter.formatQuantity(100000.0, overrideImperialFormatSpec);
    assert.equal(overrideImperialFormattedValue, "1076386.7361 ft² (US Survey)");

    const overrideImperialParserSpec = await quantityFormatter.getParserSpecByQuantityType(QuantityType.Area, true);
    const overrideValueInMeters1 = quantityFormatter.parseIntoQuantityValue("1076386.7361", overrideImperialParserSpec);
    const overrideValueInMeters2 = quantityFormatter.parseIntoQuantityValue("1076386.7361 sussf", overrideImperialParserSpec);
    // eslint-disable-next-line no-console
    // console.log(`overrideValueInMeters1=${JSON.stringify(overrideValueInMeters1)}`);
    assert(withinTolerance(overrideValueInMeters1.value!, 100000, 1.0e-5));
    assert(withinTolerance(overrideValueInMeters1.value!, overrideValueInMeters2.value!));

    await quantityFormatter.clearOverrideFormats(QuantityType.Area);

    metricFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Area, false);
    metricFormattedValue = quantityFormatter.formatQuantity(100000.0, metricFormatSpec);
    assert.equal(metricFormattedValue, "100000 m²");

    imperialFormatSpec = await quantityFormatter.getFormatterSpecByQuantityType(QuantityType.Area, true);
    imperialFormattedValue = quantityFormatter.formatQuantity(100000.0, imperialFormatSpec);
    assert.equal(imperialFormattedValue, "1076391.0417 ft²");
  });

});

// ==========================================================================================================
class DummyFormatterSpec extends FormatterSpec {
  constructor(name: string, format: Format, conversions?: UnitConversionSpec[]) {
    super(name, format, conversions);
  }

  public applyFormatting(magnitude: number): string {
    return magnitude.toFixed(6);
  }

  public static async createSpec(useImperialFormats: boolean): Promise<DummyFormatterSpec> {
    if (useImperialFormats)
      return new DummyFormatterSpec("dummy-imperial", new Format("formatName"));

    return new DummyFormatterSpec("dummy-metric", new Format("formatName"));
  }
}

// ==========================================================================================================
class DummyParserSpec extends ParserSpec {
  constructor(outUnit: UnitProps, format: Format, conversions?: UnitConversionSpec[]) {
    super(outUnit, format, conversions ?? []);
  }

  public parseIntoQuantityValue(inString: string): ParseResult {
    return Parser.parseIntoQuantityValue(inString, this.format, this.unitConversions);
  }

  public static async createParserSpec(useImperialFormats: boolean): Promise<DummyParserSpec> {
    const quantityFormatter = new QuantityFormatter();
    const formatterSpec = await DummyFormatterSpec.createSpec(useImperialFormats);
    if (useImperialFormats) {
      const outUnit = await quantityFormatter.findUnitByName("Units.FT");
      const conversions = await Parser.createUnitConversionSpecsForUnit(quantityFormatter, outUnit);
      return new DummyParserSpec(outUnit, formatterSpec.format, conversions);
    } else {
      const outUnit = await quantityFormatter.findUnitByName("Units.M");
      const conversions = await Parser.createUnitConversionSpecsForUnit(quantityFormatter, outUnit);
      return new DummyParserSpec(outUnit, formatterSpec.format, conversions);
    }
  }
}

describe("Custom FormatterSpecs", () => {
  let quantityFormatter: QuantityFormatter;
  beforeEach(async () => {
    quantityFormatter = new QuantityFormatter();
    await quantityFormatter.loadFormatAndParsingMaps(true);
  });

  it("QuantityFormatter should register properly", async () => {
    assert.isFalse(quantityFormatter.useImperialFormats);

    const customFormatterParserSpecsProvider: FormatterParserSpecsProvider = {
      quantityTypeName: "DummyQuantity",
      createFormatterSpec: DummyFormatterSpec.createSpec,
      createParserSpec: DummyParserSpec.createParserSpec,
    };

    let foundFormatterSpec: FormatterSpec;

    // chai doesn't support async throws very well..
    assert.isTrue(await didThrowAsync(async () => {
      foundFormatterSpec = await quantityFormatter.getFormatterSpecByQuantityType("DummyQuantity");
    }));

    assert.isTrue(await quantityFormatter.registerFormatterParserSpecsProviders(customFormatterParserSpecsProvider));
    assert.isFalse(await quantityFormatter.registerFormatterParserSpecsProviders(customFormatterParserSpecsProvider), "Can't register a provider twice");

    foundFormatterSpec = await quantityFormatter.getFormatterSpecByQuantityType("DummyQuantity")!;
    assert.instanceOf(foundFormatterSpec, DummyFormatterSpec);

    const formattedValue = quantityFormatter.formatQuantity(1.234567891234, foundFormatterSpec);
    assert.strictEqual(formattedValue, "1.234568");

    const parserSpec = await quantityFormatter.getParserSpecByQuantityType("DummyQuantity")!;
    assert.instanceOf(parserSpec, DummyParserSpec);

    // results should be in feet because we are set to imperial
    const meterToImperialResult = parserSpec.parseIntoQuantityValue("12.192 m");
    const feetToImperialResult = parserSpec.parseIntoQuantityValue("40 ft");
    assert(withinTolerance(40.0, feetToImperialResult.value!));
    assert(withinTolerance(meterToImperialResult.value!, feetToImperialResult.value!));
  });

});